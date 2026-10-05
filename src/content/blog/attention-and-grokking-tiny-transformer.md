---
title: 'Attention and grokking: a tiny transformer that learns the rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small transformer learns modular addition. It memorizes the training pairs in 750 steps, waits 4,750 steps more, and then answers pairs it never saw. The article builds the transformer and the C# engine that shows the jump, twice: once written by hand and once with a framework.'
lang: 'en'
pair: 'attention-and-grokking-tiny-transformer'
---

A model learns to add two numbers. It sees 843 sums, and after 750 steps it answers every one of them without a mistake.

Then you give it a sum it has never seen, and it gets it wrong. It gets **1,943 of the 1,966** sums you held back wrong, and it scores below the 1.9% it would get by guessing, because it is not unsure of itself. It is confidently wrong.

You wait. The training accuracy stays perfect the whole time, so a quick reading says the run is finished, and the number that matters does not move for almost five thousand steps. Then, between one measurement and the next, the model starts answering the held-back sums. Four measurements later it is right almost every time.

That is **grokking**, and this article makes it happen: a 56,640-parameter transformer, one arithmetic task, one laptop core.

Two papers meet in the middle of it.

In 2017, Vaswani and colleagues published [Attention Is All You Need](https://arxiv.org/abs/1706.03762). The paper proposed the transformer: a network built only from attention, with no recurrence and no convolutions. Every large model that followed is a descendant of that structure, and what it contributes is **structure**: a way to read a sequence and mix information between its positions.

In 2022, Power and colleagues described the surprise in [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177). They trained small networks on small algorithmic datasets, and they watched one fit every example it was given while it failed the examples it had not seen. The failure lasted thousands of steps, long past the point of overfitting. Then it stopped. The name of that jump comes from their paper.

## The task: modular addition

The modulus is **53**. The model reads a sum and must return the result modulo 53. Every answer is a number from 0 to 52.

```
12 + 35 = 47           already below 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

The rule fits in one line, and it has one property that makes the next 12,000 steps worth watching: **a model can pass the task by memorizing**. Nothing forces it to do the arithmetic, and memorizing is the easier answer at the start.

- **Memorize** the pairs it saw. Fast, and it answers only those.
- **Learn** addition modulo 53. Slower, and it answers every pair, including the ones it never saw.

The dataset holds every pair, so the answer is known for all of them. I keep 30% for training and hold the rest back. Those unseen pairs are the only thing that separates the two answers.

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

Now the interesting part: the run itself.

## The cliff

![Train and unseen accuracy against the training step. Train accuracy reaches 100% by step 750 while unseen accuracy is at 1.2%. Unseen accuracy stays under 26% until step 5000, rises to 70% at step 5500 and reaches 96% by step 10000.](/blog/grokking-cliff.svg)

The blue line is the training set. The red line is the held-back set.

Training accuracy hits **100% at step 750**. The model answers every pair it has seen, and the unseen accuracy is **1.2%**, below the 1.9% of guessing. The model has memorized 843 sums and learned nothing.

Then the red line stays flat for 4,750 steps. It passes 9% only at step 4,000 and 26% at step 5,000. At **step 5,500** it reaches **70%**, and by step 6,000 it reaches **91%**. From there the model answers **1,891 of the 1,966 unseen pairs**, and it keeps answering them.

The flat part of that graph is the part worth explaining. The model is not stuck. It is busy.

Two things explain it: what the model is, and what pushes it. Start with the model.

## The transformer

The model is the one from [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95) by Andrej Karpathy, with the same simplifications. It rescales every vector before it uses it, so the numbers stay in a stable range (RMSNorm). It turns negative numbers into zero (ReLU). One layer, 64 dimensions, and 8 heads, which means attention runs eight times in parallel on eight slices of the vector.

For each position the model builds a vector. The layer does two things with it.

**Attention lets positions talk to each other.** The vector becomes three new vectors: a query, a key and a value. The query of the current position meets the keys of every earlier position. Each match becomes a weight. The output is the weighted sum of the values:

```csharp
// one head, at the position pos, over the keys 0..=pos
for (int t = 0; t < nkeys; t++)
{
    double d = Dot(q, k[t]);              // how well this key matches the query
    scores[t] = d / Math.Sqrt(headDim);
}
double[] w = Softmax(scores);             // turn the scores into weights that add up to 1
double[] output = Weighted(w, v);         // one weighted sum of the values
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

The engine is 1,160 lines, and three ideas keep it that small.

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

```csharp
double y = 0;
for (int k = 0; k < len; k++) y += w[k] * x[k];
```

The direct way would give one node per multiplication and one more per addition, so a layer of 256 x 64 would need 32,000 nodes. With one node per row it needs 256.

The backward pass needs two things from that row: how much each weight should change, and how much each input should change. One multiplication gives both. Say the row came out too high by `g`. A weight that was multiplied by a large input is more to blame than a weight multiplied by a small one, so each weight takes a share of `g` proportional to its input, and each input takes a share proportional to the weight that used it:

```csharp
for (int k = 0; k < len; k++) gradW[k] += g * x[k];
for (int k = 0; k < len; k++) gradX[k] += g * w[k];
```

The weights of a row sit next to each other in the list, so both loops run over two blocks of consecutive numbers. That is where SIMD applies: the engine runs one arithmetic operation on several numbers at once, with AVX2 and FMA when the processor has them.

That is the engine: one list, one backward pass, and one node per row. It is the reason the whole experiment fits in 1,160 lines with no dependencies, and the reason a run takes ten minutes on one core instead of a day.

Now back to the flat part of the graph, and the two numbers that explain it.

## What happens underneath

Two more numbers explain what the model does during that flat stretch.

![Cross-entropy loss against the training step, on a log scale. The train loss reaches its floor by step 750 while the test loss stays flat at 3.9 until step 4000, then falls to 2.0.](/blog/grokking-loss.svg)

The train loss falls fast and reaches its floor. The test loss does not move for thousands of steps. A model that only memorized would keep that shape forever. Here the test loss starts to fall, and the fall is the rule arriving. The vertical axis is on a log scale, so the fall from 3.9 to 2.0 is a factor of two, and the last decimal matters more than it looks: the loss of a model that answers well is already close to the floor.

![Two curves against the training step, each on its own axis. On the left axis the size of the parameters rises from 19.2 to 21.8 while the model memorizes, then falls to 15.2. On the right axis the accuracy on unseen pairs stays near 1% until step 4000 and then rises to 96%.](/blog/grokking-norm.svg)

This figure has **two axes**, one per curve. The blue line uses the left axis: the size of the parameters, from 19 to 22. That is one number for the whole model, and it grows when any parameter grows. The red line uses the right axis: the accuracy on pairs the model has never seen, from 0% to 100%.

The blue line rises first. The model stores 843 separate answers, and a lookup table needs large parameters. Then the blue line falls: weight decay pulls the parameters down at every step, so the table becomes the expensive option. The red line follows. The small structured answer that adds numbers modulo 53 needs less, and once it is cheaper than the table, the accuracy on unseen pairs jumps.

The three curves together show the whole mechanism: train accuracy, unseen accuracy and the size of the parameters.

## The control

Take the decay away and the model does not learn the rule. It memorizes, and that is all it ever does:

| step | decay | train acc | unseen acc | size |
| ---: | :--- | ---: | ---: | ---: |
| 750 | with | 100% | 1.2% | 20.7 |
| 750 | without | 100% | 0.7% | 48.4 |
| 6,000 | with | 100% | 90.9% | 15.9 |
| 6,000 | without | 100% | 2.2% | 100.9 |
| 12,000 | with | 100% | **96.2%** | 15.2 |
| 12,000 | without | 93.6% | **1.6%** | 135.5 |
| 40,000 | without | 100% | **3.3%** | 245.2 |

Read the last row against the one above it. Three times the steps of the run that learned the rule, and the accuracy on unseen pairs has crawled from 1.6% to 3.3%: barely above the 1.9% of guessing, and still **65 of the 1,966 pairs**. Waiting does not help. The model is not a slow learner that needs more time; it found the table, and it has no reason to leave it.

An accuracy below chance is the signature of that. A model that memorized is not unsure about the pairs it never stored, it is confidently wrong about them. The size of the parameters says the same thing: it grows without end, to sixteen times the model that learned the rule, because nothing in the run charges for it.

The decay is not a detail of the recipe that happens to work. It is the only force in the run that makes the generalizing answer cheaper than the table, and without it the rule never arrives.

## Reproduce it

You need the .NET SDK 10 or newer, and nothing else. The first build downloads the native library, which is a few hundred megabytes.

```bash
git clone https://github.com/jacano/grokking-csharp
cd grokking-csharp
dotnet run -c Release
```

The run takes about ten minutes on one core of a normal laptop, and it writes the same three things:

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
dotnet run -c Release -- --wd 0

# a smaller modulus learns faster and shows the same shape
dotnet run -c Release -- --p 13 --steps 3000

# a longer run with a finer log
dotnet run -c Release -- --steps 40000 --eval-every 100
```

## Inference

Training can save the parameters, and the same architecture loads them back. The file `model.txt` is not part of the repository: the `--save` flag writes it at the end of a run.

```bash
dotnet run -c Release -- --save
dotnet run -c Release -- --load model.txt --infer 12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (92%), 36 (3%), 17 (2%)
```

The prompt is `[START, 12, +, 35, =]`. The model reads it and returns one probability for each of the 53 possible answers. Inference is a single forward pass: no gradient and no backward pass. `--infer` prints the three most likely answers with their probability.

## The same thing without the engine

The engine of this article is 1,160 lines, and most of them exist to compute derivatives. A framework does that part for you. The same experiment, with the model written in **55 lines** and the training loop in **12**, is in
[grokking-torchsharp](https://github.com/jacano/grokking-torchsharp), on
[TorchSharp](https://github.com/dotnet/TorchSharp), the .NET binding of PyTorch.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
dotnet run -c Release
```

That version is 26 seconds instead of ten minutes, it shows the same jump at step 3,750, and it ends at **97.3%**: 1,912 of the 1,966 unseen pairs. Its model file in full is this:

```csharp
public override Tensor forward(Tensor index)
{
    Tensor positions = arange(index.shape[1], dtype: ScalarType.Int64, device: index.device);
    Tensor x = _wte.forward(index) + _wpe.forward(positions);
    Tensor h = RmsNorm(x);
    Tensor q = _wq.forward(h).reshape(batch, length, _heads, _headDim).transpose(1, 2);
    Tensor k = _wk.forward(h).reshape(batch, length, _heads, _headDim).transpose(1, 2);
    Tensor v = _wv.forward(h).reshape(batch, length, _heads, _headDim).transpose(1, 2);
    Tensor attended = scaled_dot_product_attention(q, k, v, is_casual: true);
    x = x + _wo.forward(attended.transpose(1, 2).reshape(batch, length, _embd));
    x = x + _fc2.forward(relu(_fc1.forward(RmsNorm(x))));
    return _lmHead.forward(x);
}
```

The backward pass and the optimizer become three more lines:

```csharp
loss.backward();
optimiser.step();
```

What the framework does not remove is the thinking. It still starts an embedding at the wrong scale, and its `AdamW` is not microgpt's `Adam`: the decay sits outside the update instead of inside the gradient. With `AdamW` that version never jumped, at any decay between 0.002 and 0.5. With the decay inside the gradient, the same `wd` as the engine works. Read the two repositories side by side: one shows what a transformer does, and the other shows how little of it you have to write.

## What to take away

- **Attention moves information between positions; the MLP transforms it inside one.** The rest of the transformer is plumbing around those two operations.
- **A model can fit the data without learning the rule.** The training accuracy is a bad guide: it reaches 100% while the unseen accuracy is still at chance.
- **Grokking is a transition between two solutions.** The memorizing solution needs large weights. The generalizing solution needs less. Weight decay decides which one survives, and the decision takes thousands of steps.
- **Watch three numbers together.** Train accuracy, unseen accuracy and the size of the parameters. One curve alone hides the mechanism.

The engine, the dataset, the figures and the raw run live in two repositories:
[grokking-csharp](https://github.com/jacano/grokking-csharp), with the engine written
by hand, and [grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
with the same experiment on a framework. Every figure of this article comes from the
CSV of the first one.

If you run one thing from this article, run that one. Ten minutes on a laptop core,
and you get to watch a model sit on the wrong answer for four thousand steps and then
walk away from it.
