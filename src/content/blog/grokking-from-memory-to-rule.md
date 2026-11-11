---
title: 'Grokking: the jump from memory to rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small neural network memorizes 843 sums and then learns to add.'
lang: 'en'
pair: 'grokking-from-memory-to-rule'
---

A small neural network learns to add numbers below 53. It has 56,320 numbers inside it, and training only changes those numbers. One step is one small change, made after the network looks at a few sums.

After 1,000 steps the network answers 93% of the sums it trained on. On the sums it never saw it answers 32%. Guessing would give 1.9%, because there are 53 possible answers. So it has memorized 843 sums and learned little.

Then the rest arrives. Between step 1,000 and step 3,000 the unseen number goes from 32% to 94%, at step 5,000 it is 99%, and from step 7,500 it is 100%. It ends by answering all 1,966 sums it never saw.

That late jump is **grokking**. The name comes from [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), which saw it in small networks trained on small algorithmic tasks. The network is a transformer with one layer, the same family as the models behind chat programs. The whole experiment is two C# files and takes about 90 seconds on one core.

## The task

When a sum reaches 53 or more, subtract 53:

```
12 + 35 = 47           already below 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

The input is five symbols: `[START]`, the first number, `+`, the second number and `=`. The output is a score for each of the 53 possible answers, and the highest score is the answer the network gives.

There are 2,809 sums, because each first number from 0 to 52 can go with each second number from 0 to 52. I train on 30% of them and keep the other 70% unseen. A network can always repeat a sum it has seen. The unseen sums are the only proof that it learned addition.

| Property | Value |
| --- | ---: |
| Answers | 53 |
| Sums | 2,809 |
| Training sums (30%) | 843 |
| Unseen sums (70%) | 1,966 |
| Numbers inside the network | 56,320 |
| Accuracy by guessing | 1.9% |

## The jump

![Accuracy against the training step. Training accuracy reaches 93% at step 1,000, while unseen accuracy is at 32%. Unseen accuracy rises to 94% at step 3,000 and 99% at step 5,000, and both lines are at 100% from step 7,500.](/blog/grokking-cliff.svg)

The blue line is the training sums, the red line the unseen ones. By step 1,000 the blue line is at 93% and the red line at 32%. The red line climbs slowly at first and then fast, and the two lines meet near step 4,000.

The flat part is the interesting one. The network is not stuck. It already knows the answers for its own sums, and during those steps it is slowly replacing its table with something that also works for the sums it has not seen.

## Why it happens

Two different solutions fit the 843 training sums. The first is a table: store the answer to each of them. It is quick, and it says nothing about a sum that is not in the table. The second is addition itself, which answers every sum.

Both answers are possible, and the training has no preference between them. **Adam**, the usual optimizer (the part that decides how much to move each number), only pushes the answers to be less wrong at each step. What decides here is **weight decay**: at every step the training also pulls the 56,320 numbers a little towards zero. A table needs big numbers, one for each stored answer. Addition needs smaller ones. So the table becomes more expensive as the run goes on, and the cheaper solution wins.

The size of those numbers shows it:

![Size of the numbers and accuracy against the training step, each on its own axis. The size falls from 18.9 to 8.8 in 250 steps, climbs to 11.0 while the model memorizes, then settles at 9.3. The accuracy on unseen sums rises from 1.8% to 100%.](/blog/grokking-norm.svg)

It falls from 18.9 to 8.8 in the first 250 steps, climbs to 11.0 while the table grows, and settles at 9.3 when addition takes over.

## Where the decay goes

The same decay gives different results depending on where it is applied. Here it is added to the change of each step, which is what the original code does. The other common way is to shrink the numbers after the step, and that is what the `AdamW` optimizer does. With `AdamW` this run never learns addition: it ends at 30.9% of the unseen sums, the same number as the control below, and the numbers end at about 56 instead of 9.3.

So "weight decay" means two different things, and one of them does nothing here.

## The control

With the decay at zero the run never gets there:

| step | decay | training | unseen | size |
| ---: | :--- | ---: | ---: | ---: |
| 20,000 | with | 100% | 100% | 9.3 |
| 20,000 | without | 100% | 30.9% | 61.2 |

Without the decay the network memorizes the 843 sums and stops there. From step 2,000 to step 20,000 the unseen number moves between 30.6% and 30.9%, and the numbers grow to 61 because nothing charges for them.

## The model

The network is the one from [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), by Andrej Karpathy: a transformer with one layer and 64 dimensions. TorchSharp works out how much to change each number after every answer, so the model is one class and the training loop is a handful of lines.

## Reproduce it

You need the .NET SDK 11 or newer. The first build downloads PyTorch's native library, a few hundred megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
make run
```

`make` on its own compiles and checks the style; it does not train. `make` does not ship with Windows: use `dotnet run -c Release` where the target says `make run`.

The run takes about 90 seconds and writes the two lists of sums, a CSV with one row per step (the error and the accuracy on both sides, and the size of the numbers) and the figures. `make control` repeats it with the decay at zero, and `make run ARGS="--p 13 --steps 3000"` changes the modulus or the number of steps.

The run has 20,000 steps by default. The last 2,000 make each step smaller and smaller, down to zero, so the run stops on the solution it found instead of jumping around it.

## Ask the network a sum

Training does not keep the network, so `make save` writes it to `model.pt` and `make infer` reads it back:

```bash
make infer PAIR=12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (89%), 21 (2%), 52 (2%)
```

`12 + 35` is one of the sums held back from training, so the 89% on `47` is addition at work, not a stored answer. `make explain PAIR=12+35` writes all 53 answers to `runs/probabilities.csv` and draws them in `figures/grokking-probabilities.svg`.

## What I take from this

Accuracy on the training sums says little on its own. In this run, weight decay decides between a table and the rule.

I am not a machine learning researcher. This is a small experiment I could reproduce from end to end, understand, and enjoy watching move. The code, the data and the logs are in
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
so that anyone who wants to see it happen can run it in a minute and a half.
