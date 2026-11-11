---
title: 'Grokking: the jump from memory to rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small neural network memorizes 843 sums and then learns to add.'
lang: 'en'
pair: 'grokking-from-memory-to-rule'
---

A small neural network learns modular addition. It has 56,320 numbers inside it, and training sets those numbers. After 1,000 steps it answers 93% of the sums it was trained on and 32% of the sums it has never seen; guessing would give 1.9%. It has memorized 843 sums, and most of the rule is still missing.

Two thousand steps later the rest arrives: 94% of the unseen sums at step 3,000, 99% at 5,000, and all of them from 7,500. The run ends at **100%**: 1,966 of the 1,966 sums it never saw.

That delayed jump is **grokking**. The name comes from [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), which reported it in small networks trained on small algorithmic datasets. The network is a transformer, the kind behind language models, with one layer. The experiment is two C# files and takes about 90 seconds on one core.

## The task

The model reads five symbols — `[START]`, the first number, `+`, the second number, `=` — and returns a score for each of the 53 possible answers.

```
12 + 35 = 47           already below 53
40 + 30 = 70   →  17
50 + 50 = 100  →  47
```

There are 2,809 sums. I train on 30% of them and hold back the rest, so the unseen sums are the only evidence that the model learned arithmetic and not a lookup table.

| Property | Value |
| --- | ---: |
| Modulus | 53 |
| Sums | 2,809 |
| Training sums (30%) | 843 |
| Unseen sums (70%) | 1,966 |
| Parameters | 56,320 |
| Accuracy by guessing | 1.9% |

## The jump

![Train and unseen accuracy against the training step. Train accuracy reaches 93% at step 1,000, while unseen accuracy is at 32%. Unseen accuracy rises to 94% at step 3,000 and 99% at step 5,000, and both lines are at 100% from step 7,500.](/blog/grokking-cliff.svg)

The blue line is the training sums, the red line the unseen ones. The model memorizes by step 1,000, with the unseen sums still at 32%. The two lines meet around step 4,000.

The flat part of the curve is the part worth watching. The model is not stuck: it is changing its mind.

## Why it happens

Two solutions fit the training data. One is a table of the 843 sums: fast, and useless for a sum that is not in it. The other is the rule, which answers everything.

Training only tries to make the answers less wrong; it has no preference between the two. It uses **Adam**, the standard optimizer, which at each step nudges every number in the direction that helps. **Weight decay** adds a second nudge, towards zero, and that is the one that decides: it charges for size, the table needs big numbers and the rule needs small ones, so the table gets more expensive as the run goes on and the training drifts to the rule.

Where the second nudge goes matters. Inside the update it works. As a separate shrink applied after the update, the AdamW variant, it does nothing here: the run ends at 30.9% of the unseen sums, the same as with no decay at all.

![Two curves against the training step, each on its own axis. On the left axis the size of the parameters falls from 18.9 to 8.8 in 250 steps, climbs to 11.0 while the model memorizes, then settles at 9.3. On the right axis the accuracy on unseen pairs rises from 1.8% to 100%.](/blog/grokking-norm.svg)

The size of the numbers falls from 18.9 to 8.8 in the first 250 steps, climbs to 11.0 while the model memorizes, and settles at 9.3 once the rule arrives.

## The control

With the decay at zero the run never gets there:

| step | decay | training | unseen | size |
| ---: | :--- | ---: | ---: | ---: |
| 20,000 | with | 100% | 100% | 9.3 |
| 20,000 | without | 100% | 30.9% | 61.2 |

Without decay the model memorizes the training sums and stops there: more steps do not move the unseen number.

## The model

The network is the one from [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), by Andrej Karpathy: a transformer with one layer and 64 dimensions. TorchSharp works out how to adjust the numbers after each answer, so the model is one class and the training loop is a handful of lines.

## Reproduce it

You need the .NET SDK 11 or newer. The first build downloads PyTorch's native library, a few hundred megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
make run
```

`make` on its own compiles and checks the style; it does not train. `make` does not ship with Windows: use `dotnet run -c Release` where the target says `make run`.

The run takes about 90 seconds and writes the two splits, a CSV with one row per step (the error and the accuracy on both sides, and the size of the numbers) and the figures. `make control` repeats it with the decay at zero, and `make run ARGS="--p 13 --steps 3000"` changes the modulus or the number of steps.

The defaults are 20,000 steps. The last 2,000 take the learning rate to zero, so the run settles instead of ending on an oscillation.

## Ask the model a sum

Training does not keep the model, so `make save` writes it to `model.pt` and `make infer` reads it back:

```bash
make infer PAIR=12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (89%), 21 (2%), 52 (2%)
```

`12 + 35` is one of the sums held back from training, so the 89% on `47` is the rule at work, not a stored answer. `make explain PAIR=12+35` writes all 53 answers to `runs/probabilities.csv` and draws them in `figures/grokking-probabilities.svg`.

## What I take from this

Training accuracy says very little on its own. In this run, weight decay is what picks the rule over the table.

I am not a machine learning researcher. This is a small experiment I could reproduce from end to end, understand, and enjoy watching move. The code, the data and the logs are in
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
so that anyone who wants to see it happen can run it in a minute and a half.
