---
title: 'Grokking: the jump from memory to rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small transformer memorizes 843 sums and then learns to add. This is the run, and the jump that separates the two.'
lang: 'en'
pair: 'grokking-from-memory-to-rule'
---

A transformer with 56,320 parameters learns modular addition. After 1,000 steps it answers 93% of its training pairs correctly. On the pairs it has never seen it is at 32%, and guessing would give it 1.9%. It has memorized 843 sums, and most of the rule is still missing.

The gap closes over the next two thousand steps: 94% of the unseen pairs at step 3,000, 99% at 5,000, and all of them from 7,500. The run ends at **100%**: 1,966 of the 1,966 pairs it never saw.

That delayed jump is **grokking**. The name comes from [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), which reported it in small networks trained on small algorithmic datasets. The architecture is the transformer from [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (Vaswani et al., 2017). The whole experiment is two C# files and takes about 90 seconds on one core.

## The task

The modulus is 53. The model reads a sum and returns the result modulo 53, so every answer is a number from 0 to 52.

```
12 + 35 = 47           already below 53
40 + 30 = 70   →  17
50 + 50 = 100  →  47
```

There are 2,809 pairs. I train on 30% of them and hold back the rest, so the unseen pairs are the only evidence that the model learned arithmetic and not a lookup table.

| Property | Value |
| --- | ---: |
| Modulus | 53 |
| Pairs | 2,809 |
| Training pairs (30%) | 843 |
| Unseen pairs (70%) | 1,966 |
| Vocabulary | 56 tokens |
| Parameters | 56,320 |
| Accuracy by guessing | 1.9% |

The vocabulary is 56 entries: the 53 numbers, `+`, `=`, and a start token. A document is six tokens, and the model predicts each next one:

| Position | Token | Role |
| ---: | :---: | --- |
| 1 | `[START]` | start of the document |
| 2 | `12` | first operand |
| 3 | `+` | the operator |
| 4 | `35` | second operand |
| 5 | `=` | the position of the answer |
| 6 | `47` | **the target** |

## The jump

![Train and unseen accuracy against the training step. Train accuracy reaches 93% at step 1,000, while unseen accuracy is at 32%. Unseen accuracy rises to 94% at step 3,000 and 99% at step 5,000, and both lines are at 100% from step 7,500.](/blog/grokking-cliff.svg)

The blue line is the training pairs, the red line the unseen ones. The model memorizes by step 1,000, with the unseen pairs still at 32%. The two lines meet around step 4,000.

The flat part of the curve is the part worth watching. The model is not stuck: it is changing its mind.

## Why it happens

Two solutions fit the training data. One is a table of the 843 pairs: fast, and useless for a pair that is not in it. The other is the arithmetic, which fits only when the model finds a representation that computes it, and then answers everything.

The optimizer knows about neither. It reduces a loss and nothing else. In this run the balance tips with **weight decay**, which pulls every parameter towards zero at every step. It charges for size, and the table is the bigger solution, so as the run goes on gradient descent drifts to the arithmetic.

The run's own numbers point that way:

![Two curves against the training step, each on its own axis. On the left axis the size of the parameters falls from 18.9 to 8.8 in 250 steps, climbs to 11.0 while the model memorizes, then settles at 9.3. On the right axis the accuracy on unseen pairs rises from 1.8% to 100%.](/blog/grokking-norm.svg)

The size of the parameters falls from 18.9 to 8.8 in the first 250 steps, climbs to 11.0 while the model memorizes, and settles at 9.3 once the rule arrives.

## The control

With the decay at zero the run never gets there:

| step | decay | train acc | unseen acc | size |
| ---: | :--- | ---: | ---: | ---: |
| 20,000 | with | 100% | 100% | 9.3 |
| 20,000 | without | 100% | 30.9% | 61.2 |

Without decay the model memorizes the training set and stops there: more steps do not move the unseen number.

## The model

The model is the one from [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95) by Andrej Karpathy: one layer, 64 dimensions, 8 heads, and the same small pieces as the original. Each position can read the earlier ones, a small network transforms what it read, and both add their result back, so the signal has a straight path through the layer.

There is no positional embedding. The token already says which operand it is, because `a` comes before `+` and `b` comes after it, and addition is symmetric. A second table would tell the two slots apart and add nothing.

That is the whole architecture. TorchSharp supplies the automatic differentiation, so the model is one class and the loop is a handful of lines.

## Reproduce it

You need the .NET SDK 11 or newer. The first build downloads PyTorch's native library, a few hundred megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
make run
```

`make` on its own compiles and checks the style; it does not train. `make` does not ship with Windows: use `dotnet run -c Release` where the target says `make run`.

The run takes about 90 seconds and writes three things:

| Where | What |
| --- | --- |
| `data/train.txt`, `data/test.txt` | the two splits, one pair per line: 843 lines and 1,966 lines |
| `runs/grokking.csv` | the logged numbers of every step |
| `figures/` | the figures in this article |

Each row of `runs/grokking.csv` has six columns:

| Column | Meaning |
| --- | --- |
| `step` | training step |
| `train_loss` | loss on the answer over 512 training pairs |
| `train_acc` | exact match on those pairs |
| `test_loss` | loss on the answer over all 1,966 unseen pairs |
| `test_acc` | exact match on the unseen pairs |
| `param_norm` | the length of all 56,320 parameters: the square root of the sum of their squares |

The Makefile has one target per action; `make help` lists them. The two worth knowing here are `make control`, which repeats the run with the decay at zero, and `make run ARGS="--p 13 --steps 3000"`, which changes the modulus or the number of steps.

The defaults are a learning rate of 0.003, a decay of 0.005 and 20,000 steps. The last 2,000 take the learning rate to zero, so the run settles instead of ending on an oscillation.

## Ask the model a sum

Training does not keep the model, so `make save` writes it to `model.pt` and `make infer` reads it back:

```bash
make infer PAIR=12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (89%), 21 (2%), 52 (2%)
```

`12 + 35` is one of the pairs held back from training, so the 89% on `47` is the rule at work, not a stored answer. `make explain PAIR=12+35` writes all 53 answers to `runs/probabilities.csv` and draws them in `figures/grokking-probabilities.svg`.

## What I take from this

Training accuracy says very little on its own. In this run, weight decay is what picks the rule over the table.

I am not a machine learning researcher. This is a small experiment I could reproduce from end to end, understand, and enjoy watching move. The code, the data and the logs are in
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
so that anyone who wants to see it happen can run it in a minute and a half.
