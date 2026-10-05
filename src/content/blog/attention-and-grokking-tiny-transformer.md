---
title: 'Attention and grokking: a tiny transformer that learns the rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small transformer learns modular addition. It memorizes the training pairs in 600 steps, waits 4,000 steps more, and then answers pairs it never saw. The article builds the transformer and the Rust engine that shows the jump.'
lang: 'en'
pair: 'attention-and-grokking-tiny-transformer'
---

Two results changed machine learning, and they are different in kind.

In 2017, Vaswani and colleagues published [Attention Is All You Need](https://arxiv.org/abs/1706.03762). The paper proposed the transformer: a network built only from attention, with no recurrence and no convolutions. That architecture became the base of every large model that followed, and the result is about **structure**. It is a way to build a network that reads a sequence and mixes information across its positions.

In 2022, Power and colleagues reported a smaller and stranger result in [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177). They trained networks on small algorithmic datasets, and they watched a model fit every example it was given while it kept guessing on the examples it had not seen. The guessing lasted long past the point of overfitting, where the training examples are already perfect and new examples still fail. Then the model changed: from one measurement to the next, it started to answer the unseen examples correctly, and it kept answering them. That change is grokking. The model memorized first and it learned the rule later.

This article puts both results in one program. The program is a transformer of 56,640 parameters, and it trains on one arithmetic task. Then it shows the jump. The engine exists twice, in **Rust** and in **C#**, both with no dependencies. The two versions start from the same weights and show the same curve.

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

The model is the one from [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95) by Andrej Karpathy, with the same simplifications. It rescales every vector before it uses it, so the numbers stay in a stable range (RMSNorm). It turns negative numbers into zero (ReLU). One layer, 64 dimensions, and 8 heads, which means attention runs eight times in parallel on eight slices of the vector.

For each position the model builds a vector. The layer does two things with it.

**Attention lets positions talk to each other.** The vector becomes three new vectors: a query, a key and a value. The query of the current position meets the keys of every earlier position. Each match becomes a weight. The output is the weighted sum of the values:

```rust
// one head, at position pos, over the keys 0..=pos
for t in 0..nkeys {
    let d = dot(q, k[t]);              // how much this key matches the query
    scores[t] = d / (head_dim as f64).sqrt();
}
let w = softmax(scores);               // turns the scores into weights that add up to 1
let out = w * v;                       // a weighted sum of the values
```

The model builds a key and a value for every position it has already read, and it keeps them in a cache. That cache is the **KV cache** of large language models. It is what lets a model produce one new token without working out the keys and values of the whole conversation again, and it is the reason a long chat stays fast.

The cache also gives the model its only rule about the future: position `t` can look at positions `0` to `t`, and nothing else, because the cache grows one token at a time. This engine builds that cache on every forward pass, training included.

**The MLP does the thinking at one position.** It projects the vector to four times its width, turns negative numbers into zero, and projects it back. Attention moves information between positions. The MLP transforms information inside one position. Both parts add their result back to their input, so the signal has a straight path through the layer.

## How the model learns

At every position the model produces one score for each token in the vocabulary. For this task that is 56 scores: one per candidate for the next token. A high score means "I expect this one next".

**The loss is one number that says how wrong the model was.** It looks at one thing only: the chance the model gave to the answer that was correct.

| Chance on the right answer | Loss |
| ---: | ---: |
| 100% | 0.0 |
| 50% | 0.7 |
| 10% | 2.3 |
| 1% | 4.6 |

A model that is sure and right scores 0.0. A model that leaves the right answer at one chance in a hundred scores 4.6, and it scores the same whether it was sure about a different answer or simply unsure. The loss never goes below zero, so the only way to make it smaller is to give the correct answer more chance.

The rule has a name: **cross-entropy**. It is the standard way to score a model that returns one probability per option, and it is the number that the training loop works to reduce.

The engine computes the loss at the five positions of the document and takes the average. That average is the number in the figures and in the `loss` columns of the CSV.

**Learning means changing the parameters to make the loss smaller.** The 56,640 parameters are the numbers the model learns. For each parameter, the engine works out how much it moves the loss and in which direction. That number is the **gradient**. Then the engine moves every parameter a little against its gradient. One set of moves is one **training step**. The engine uses a standard rule called Adam to choose the size of each move.

**Weight decay is a second and smaller force.** At every step the engine also pulls every parameter a little towards zero. Two things follow from that. First, no parameter can grow without limit. Second, and this is the part that matters here, the cheapest answer wins. A model can fit the training pairs by storing them one at a time, and that needs large parameters. A model that learns the rule needs less. Weight decay makes the second option cheaper as the steps go by, and that is what produces the jump in the next section.

## The engine

Three ideas keep the training engine small.

**1. Every value of the computation is one node in a single list.**

A node is one entry of that list. It holds four things:

- **value**: the number itself.
- **gradient**: how much this number moves the loss. The backward pass fills it in later.
- **inputs**: the nodes this value was computed from.
- **local derivative**: how the value changes when each input changes.

Take `y = a * b`. The engine adds one node: the value `a * b`, the inputs `a` and `b`, and the two local derivatives `b` and `a`. Nothing becomes a separate object, the list is reused on every step, and the memory stays flat.

**2. The gradient travels backwards through the same list.**

A node always sits after the nodes it was computed from. So the backward pass reads the list from the end to the start. When it reaches a node, every node that depends on it has already passed its gradient down, and the gradient of that node is complete. One pass, no recursion and no sorting.

**3. A matrix-vector product becomes one node per row.**

A row of the matrix computes one number: the sum of each weight multiplied by its input. The engine writes that whole sum into a single node.

```rust
let mut y = 0.0;
for k in 0..len {
    y += w[k] * x[k];
}
```

The direct way would give one node per multiplication and one more per addition, so a layer of 256 x 64 would need 32,000 nodes. With one node per row it needs 256.

The backward pass needs two things from that row: how much each weight should change, and how much each input should change. One multiplication gives both. Say the row came out too high by `g`. A weight that was multiplied by a large input is more to blame than a weight multiplied by a small one, so each weight takes a share of `g` proportional to its input, and each input takes a share proportional to the weight that used it:

```rust
for k in 0..len {
    grad_w[k] += g * x[k];
    grad_x[k] += g * w[k];
}
```

The weights of a row sit next to each other in the list, so both loops run over two blocks of consecutive numbers. That is where SIMD applies: the engine runs one arithmetic operation on several numbers at once, with AVX2 and FMA when the processor has them.

## The cliff

![Train and unseen accuracy against the training step. Train accuracy reaches 99% by step 600 while unseen accuracy is at 1%. Unseen accuracy stays under 12% until step 4000, rises to 72% at step 5000 and reaches 94% by step 8000.](/blog/grokking-cliff.svg)

The blue line is the training set. The red line is the test set.

The training accuracy reaches **99% at step 600**. The model already answers every pair it has seen. The test accuracy is at **1.0%**, below the 1.9% of random guessing. The model has memorized.

Then the red line stays low for 4,000 more steps. It passes 12% only at step 4,000. At **step 5,000** it reaches **72%**, and by step 6,000 it reaches **92%**. From that point the model answers **1,842 of the 1,966 unseen pairs**, and it keeps answering them.

The flat part of the graph is the interesting part. The model is not stuck. It is busy.

## What happens underneath

Two more numbers explain what the model does during that flat part.

![Cross-entropy loss against the training step, on a log scale. The train loss reaches its floor by step 600 while the test loss stays flat at 2.0 until step 4000, then falls to 0.2.](/blog/grokking-loss.svg)

The train loss falls fast and reaches its floor. The test loss does not move for thousands of steps. A model that only memorized would keep that shape forever. Here the test loss starts to fall, and the fall is the rule arriving. The vertical axis is on a log scale, so the fall from 2.0 to 0.2 is a factor of ten.

![Two curves against the training step, each on its own axis. On the left axis the size of the parameters rises from 19.2 to 21.9 while the model memorizes, then falls to 15.3. On the right axis the accuracy on unseen pairs stays near 1% until step 4000 and then rises to 94%.](/blog/grokking-norm.svg)

This figure has **two axes**, one per curve. The blue line uses the left axis: the size of the parameters, from 19 to 22. That is one number for the whole model, and it grows when any parameter grows. The red line uses the right axis: the accuracy on pairs the model has never seen, from 0% to 100%.

The blue line rises first. The model stores 843 separate answers, and a lookup table needs large parameters. Then the blue line falls: weight decay pulls the parameters down at every step, so the table becomes the expensive option. The red line follows. The small structured answer that adds numbers modulo 53 needs less, and once it is cheaper than the table, the accuracy on unseen pairs jumps.

The three curves together show the whole mechanism: train accuracy, unseen accuracy and the size of the parameters.

## Reproduce it

You need Rust 1.75 or newer. The same engine is also written in **C#**, and that one needs the .NET SDK 10 or newer. There is no other dependency in either case.

```bash
# Rust
git clone https://github.com/jacano/grokking-rs
cd grokking-rs
cargo run --release

# C#
git clone https://github.com/jacano/grokking-csharp
cd grokking-csharp
dotnet run -c Release
```

Both runs take about ten minutes on one core of a normal laptop, show the same curve, and write the same three things:

| Where | What |
| --- | --- |
| `data/train.txt`, `data/test.txt` | the two splits of the dataset, one pair per line: 843 lines and 1,966 lines |
| `runs/grokking.csv` | the logged numbers of every step |
| `figures/` | the three figures of this article |

The two text files are the raw pairs, in the same shape the model reads them. They are for reading and counting: training uses the same pairs from memory. The repository keeps a copy of each.

Each row of the CSV has six columns, so you can follow the process from any tool:

| Column | Meaning |
| --- | --- |
| `step` | training step |
| `train_loss` | mean cross-entropy over 512 train pairs |
| `train_acc` | exact match on those train pairs |
| `test_loss` | mean cross-entropy over all 1,966 unseen pairs |
| `test_acc` | exact match on the unseen pairs |
| `param_norm` | size of every parameter, as one number for the whole model |

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

Training can save the parameters, and the same architecture loads them back. The file `model.txt` is not part of the repository: the `--save` flag writes it at the end of a run.

```bash
cargo run --release -- --save
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
- **Watch three numbers together.** Train accuracy, unseen accuracy and the size of the parameters. One curve alone hides the mechanism.

The engine, the dataset, the figures and the raw run live in two repositories:
[grokking-rs](https://github.com/jacano/grokking-rs) and
[grokking-csharp](https://github.com/jacano/grokking-csharp). Both have no
dependencies, both are about 1,200 lines, and both start from the same weights.
Every figure of this article comes from the CSV of the Rust run.
