---
title: 'Attention and grokking: a tiny transformer that learns the rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small transformer learns modular addition. It memorizes the training pairs in 500 steps, waits thousands of steps, and then answers pairs it never saw. The article builds the transformer and the 600-line Rust engine that shows the jump.'
---

Two results changed machine learning, and they are different in kind.

In 2017, *Attention is all you need* replaced recurrence with attention. The transformer became the base of every large model that followed. That result is about **architecture**: a way to build a network that reads a sequence and mixes information across positions.

In 2022, a smaller and stranger result: **grokking**. A model trains on a small algorithmic task. Its accuracy on the training set reaches 100% in a few hundred steps. Its accuracy on data it has never seen stays at chance. Nothing changes for thousands of steps. Then, suddenly, the unseen accuracy jumps to the rule level. The model memorized first, and it learned the rule later.

This article puts both results in one program. The program is a transformer of 56,640 parameters. The engine is about 1,100 lines of Rust with no dependencies, and it trains on one arithmetic task. Then it shows the jump.

## The task: modular addition

The model reads a sum and must return the result modulo `p`.

```
12 + 35 =      →      47        (p = 53, and 12 + 35 = 47 < 53)
40 + 30 =      →      17        (70 mod 53 = 17)
```

That rule is the whole task. A model can answer it in two ways:

- **Memorize** the pairs it saw during training. This is easy and fast.
- **Learn** addition modulo `p`. This is slower, and it answers every pair, including the pairs the model never saw.

The dataset contains every pair, so the task has a known answer for all of them. I keep 30% for training and the rest for testing. The test set is the part that separates the two ways.

| Property | Value |
| --- | ---: |
| Modulus `p` | 53 |
| Number pairs | 2,809 |
| Train pairs (30%) | 843 |
| Test pairs (70%) | 1,966 |
| Vocabulary | 56 tokens |
| Document length | 6 tokens |
| Prediction positions | 5 |
| Model parameters | 56,640 |
| Chance accuracy | 1.9% |

The vocabulary is small: the 53 numbers, plus `+`, `=` and a start token. Each number is **one token**, so the model sees the operands as whole units.

The document is one sequence, exactly like a sentence in a language model:

```
[START]   12   +   35   =   [47]
   ↑      ↑    ↑   ↑    ↑    ↑
   |      |    |   |    |    └── the model must predict this token, the answer
   |      |    |   |    └─────── the input here is "="
   |      |    |   └──────────── the second operand
   |      |    └──────────────── the operator
   |      └───────────────────── the first operand
   └──────────────────────────── start of document
```

The model predicts every next token in the sequence, the way a language model does. Only the last prediction is the task. The other four positions predict the prompt itself.

## The transformer

The model is the one from [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95) by Andrej Karpathy, with the same simplifications: RMSNorm instead of LayerNorm, no biases, and ReLU instead of GeLU. One layer, 64 dimensions, 8 heads.

For each position the model builds a vector. The layer does two things with it.

**Attention lets positions talk to each other.** The vector becomes three new vectors: a query, a key and a value. The query of the current position meets the keys of every earlier position. Each match becomes a weight. The output is the weighted sum of the values:

```rust
// one head, at position pos, over the keys 0..=pos
for t in 0..nkeys {
    let d = dot(q, k[t]);              // how much this key matches the query
    scores[t] = d / (head_dim as f64).sqrt();
}
let w = softmax(scores);               // weights over the past
let out = w * v;                       // a weighted sum of the values
```

The model builds a key and a value for every position it has already read, and it keeps them in a cache. Causal masking is free here: position `t` only ever sees positions `0..=t`, because the cache grows one token at a time.

**The MLP does the thinking at one position.** It projects the vector to four times its width, applies ReLU and projects it back. Attention moves information between positions. The MLP transforms information inside one position. Residual connections wrap both parts, so the signal has a straight path through the layer.

## The engine

Three ideas keep the training engine small.

**1. One flat arena of nodes.** Every value in the computation graph is a node in one vector. A node holds its data, its gradient, the indices of its children, and the local derivative of the operation.

**2. The reverse order is already a topological order.** A node is created after its inputs, so its children always have smaller indices. Backprop is one loop from the last node to the first. There is no recursion, no visited set and no topological list.

**3. A matrix-vector product is one node per row.** The direct way creates one node per product and one node per sum: a layer of 256x64 becomes 32,000 nodes. Here the whole row is one node, and its backward pass is analytic:

```
forward     y[i] = Σ_j W[i][j] · x[j]
backward    dL/dW[i][j] += g[i] · x[j]
            dL/dx[j]    += Σ_i g[i] · W[i][j]
```

The weights of a row are contiguous in memory, so the forward pass is a dot product between two contiguous slices. That is where SIMD applies: the engine uses AVX2 and FMA when the processor has them.

## The cliff

![Train and unseen accuracy against the training step. Train accuracy reaches 99% by step 600 while unseen accuracy is at 1%. Unseen accuracy stays under 12% until step 4000, rises to 72% at step 5000 and reaches 94% by step 8000.](/blog/grokking-cliff.svg)

The blue line is the training set. The red line is the test set.

The training accuracy reaches **99% at step 600**. The model already answers every pair it has seen. The test accuracy is at **1.0%**, below the 1.9% of random guessing. The model has memorized.

Then the red line stays low for 4,000 more steps. It passes 12% only at step 4,000. At **step 5,000** it reaches **72%**, and by step 6,000 it reaches **92%**. From that point the model answers **1,842 of the 1,966 unseen pairs**, and it keeps answering them.

The flat part of the graph is the interesting part. The model is not stuck. It is busy.

## What happens underneath

Two more numbers explain what the model does during that flat part.

![Cross-entropy loss against the training step, on a log scale. The train loss reaches its floor by step 600 while the test loss stays flat at 2.0 until step 4000, then falls to 0.2.](/blog/grokking-loss.svg)

The train loss falls fast and reaches its floor. The test loss does not move for thousands of steps. A model that only memorized would keep that shape forever. Here the test loss starts to fall, and the fall is the rule arriving.

![The L2 norm of all parameters against the training step, with the unseen accuracy over the same axis. The norm rises from 19.2 to 21.9 while the model memorizes, then falls to 15.3 as the unseen accuracy rises from 1% to 94%.](/blog/grokking-norm.svg)

The parameter norm rises from **19.2 to 21.9** while the model memorizes, and then falls to **15.3**. The memorizing solution stores 843 separate answers, and a lookup table needs large weights. The small structured solution that implements addition needs less. Weight decay pays for the weights at every step, so the table becomes the expensive option. The jump is the moment the rule becomes cheaper than the table.

This is the mechanism that the grokking papers describe, and it is visible in three curves: train accuracy, test accuracy and the parameter norm.

## Reproduce it

You need Rust 1.75 or newer. There is no other dependency.

```bash
git clone https://github.com/jacano/grokking-rs
cd grokking-rs
cargo run --release
```

The run takes about eight minutes on one core of a normal laptop. It writes `runs/grokking.csv` and the three figures of this article in `figures/`.

Each row of the CSV has six columns, so you can follow the process from any tool:

| Column | Meaning |
| --- | --- |
| `step` | training step |
| `train_loss` | mean cross-entropy over 512 train pairs |
| `train_acc` | exact match on those train pairs |
| `test_loss` | mean cross-entropy over all 1,966 unseen pairs |
| `test_acc` | exact match on the unseen pairs |
| `param_norm` | L2 norm of every parameter |

To watch the learning while it happens:

```bash
# Linux and macOS
tail -f runs/grokking.csv

# Windows PowerShell
Get-Content runs/grokking.csv -Wait
```

A few experiments change the result in a useful way:

```bash
# control: no weight decay, so nothing pulls the model off the memorizing solution
cargo run --release -- --wd 0

# a smaller modulus learns faster and shows the same shape
cargo run --release -- --p 13 --steps 3000

# a longer run with a finer log
cargo run --release -- --steps 40000 --eval-every 100
```

## Inference

Training can save the parameters, and the same architecture loads them back.

```bash
cargo run --release -- --save model.txt
cargo run --release -- --load model.txt --infer 12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (97%), 38 (1%), 3 (1%)
```

The prompt is `[START, 12, +, 35, =]`. The model reads it and returns one probability for each of the 53 possible answers. Inference is a single forward pass: no gradient and no backward pass. `--infer` prints the three most likely answers with their probability.

## What to take away

- **Attention moves information between positions; the MLP transforms it inside one.** The rest of the transformer is plumbing around those two operations.
- **A model can fit the data without learning the rule.** The training accuracy is a bad guide: it reaches 100% while the unseen accuracy is still at chance.
- **Grokking is a transition between two solutions.** The memorizing solution needs large weights. The generalizing solution needs less. Weight decay decides which one survives, and the decision takes thousands of steps.
- **Watch three numbers together.** Train accuracy, unseen accuracy and the parameter norm. One curve alone hides the mechanism.

The engine, the dataset, the figures and the raw run are in
[github.com/jacano/grokking-rs](https://github.com/jacano/grokking-rs). The code is
about 1,100 lines of Rust with no dependencies, and every figure of this article
comes from the CSV of that run.
