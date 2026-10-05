---
title: 'Attention and grokking: a tiny transformer that learns the rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small transformer learns modular addition. It memorizes the training pairs in 600 steps, waits 4,000 steps more, and then answers pairs it never saw. The article builds the transformer and the Rust engine that shows the jump.'
---

Two results changed machine learning, and they are different in kind.

In 2017, Vaswani and colleagues published [Attention Is All You Need](https://arxiv.org/abs/1706.03762). The paper proposed the transformer: a network built only from attention, with no recurrence and no convolutions. That architecture became the base of every large model that followed, and the result is about **structure**. It is a way to build a network that reads a sequence and mixes information across its positions.

In 2022, Power and colleagues reported a smaller and stranger result in [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177). They trained networks on small algorithmic datasets, and they watched a model fit every example it was given while it kept guessing on the examples it had not seen. The guessing lasted long past the point of overfitting. Then the model changed: from one measurement to the next, it started to answer the unseen examples correctly, and it kept answering them. That change is grokking. The model memorized first and it learned the rule later.

This article puts both results in one program. The program is a transformer of 56,640 parameters. The engine is about 1,100 lines of Rust with no dependencies, and it trains on one arithmetic task. Then it shows the jump.

## The task: modular addition

The modulus is **53**. The model reads a sum and must return the result modulo 53. Every answer is a number from 0 to 52.

```
12 + 35 = 47           already below 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

That rule is the whole task. A model can answer it in two ways:

- **Memorize** the pairs it saw during training. This is easy and fast.
- **Learn** addition modulo 53. This is slower, and it answers every pair, including the pairs the model never saw.

The dataset contains every pair, so the task has a known answer for all of them. I keep 30% for training and the rest for testing. The test set is the part that separates the two ways.

| Property | Value |
| --- | ---: |
| Modulus | 53 |
| Number pairs | 2,809 |
| Train pairs (30%) | 843 |
| Test pairs (70%) | 1,966 |
| Vocabulary | 56 tokens |
| Document length | 6 tokens |
| Prediction positions | 5 |
| Model parameters | 56,640 |
| Chance accuracy | 1.9% |

The vocabulary is small: the 53 numbers, plus `+`, `=` and a start token. Each number is **one token**, so the model sees the operands as whole units.

The document is one sequence, exactly like a sentence in a language model. The model predicts every next token, and only the last prediction is the task:

| Position | Token | Role |
| ---: | :---: | --- |
| 1 | `[START]` | start of the document |
| 2 | `12` | first operand |
| 3 | `+` | the operator |
| 4 | `35` | second operand |
| 5 | `=` | the input at the answer position |
| 6 | `47` | **the target**: the model must predict this token |

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

![Two curves against the training step, each on its own axis. On the left axis the L2 norm of the parameters rises from 19.2 to 21.9 while the model memorizes, then falls to 15.3. On the right axis the accuracy on unseen pairs stays near 1% until step 4000 and then rises to 94%.](/blog/grokking-norm.svg)

This figure has **two axes**, one per curve. The blue line uses the left axis: the L2 norm of the parameters, from 19 to 22. The red line uses the right axis: the accuracy on pairs the model has never seen, from 0% to 100%.

The blue line rises first. The model stores 843 separate answers, and a lookup table needs large weights. Then the blue line falls: weight decay pays for the weights at every step, so the table becomes the expensive option. The red line follows. The small structured solution that implements addition needs less weight, and once it is cheaper than the table, the accuracy on unseen pairs jumps.

The three curves together show the whole mechanism: train accuracy, unseen accuracy and the parameter norm.

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
