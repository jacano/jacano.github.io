---
title: 'Grokking: the jump from memory to rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small neural network memorizes 843 sums and then learns to add.'
lang: 'en'
pair: 'grokking-from-memory-to-rule'
---

A small neural network learns to add numbers below 53. Inside it there are 56,320 numbers, and training only changes those.

After 1,000 steps it answers 93% of the sums it trained on, and 32% of the sums it has never seen. Guessing would give 1.9%, because there are 53 possible answers. So the network has learned its training sums by heart, and nothing about the rest.

Then the rest arrives. Between step 1,000 and step 3,000 the unseen number goes from 32% to 94%, at step 5,000 it is 99%, and from step 7,500 it is 100%: 1,966 sums it never saw, all of them right.

That late jump is **grokking**. The name comes from [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), which saw it in small networks trained on small algorithmic tasks. The network is a transformer with one layer, the same family as the models behind chat programs. The experiment is two C# files and takes about 90 seconds on one core.

## The task

The answer is always a number from 0 to 52. When a sum reaches 53 or more, subtract 53:

```
12 + 35 = 47           already below 53
40 + 30 = 70   →  17
50 + 50 = 100  →  47
```

The network reads five symbols — a start mark, the first number, `+`, the second number and `=` — and gives a score to each of the 53 possible answers. The highest score is the answer.

There are 2,809 sums, because each first number from 0 to 52 can go with each second number from 0 to 52. I train on 843 of them and keep the other 1,966 out of sight. A network can always repeat a sum it has seen, so the unseen sums are the only proof that it learned addition.

## The jump

![Accuracy against the training step. Training accuracy reaches 93% at step 1,000, while unseen accuracy is at 32%. Unseen accuracy rises to 94% at step 3,000 and 99% at step 5,000, and both lines are at 100% from step 7,500.](/blog/grokking-cliff.svg)

The blue line is the training sums, the red line the unseen ones. By step 1,000 the blue line is at 93% and the red line at 32%. Then the red line climbs, slowly at first and then fast, and the two lines meet near step 4,000.

The interesting part is what happens between step 1,000 and step 3,000. The network is not stuck: it already knows the answers for its own sums, and during those steps it is slowly replacing what it memorized with something that also works for the sums it has not seen.

## Why it happens

Two different solutions can explain the 843 training sums. The first is a table: store the answer to each of them. It is quick, and it says nothing about a sum that is not in the table. The second is addition itself, which answers every sum.

Both are possible, and the training has no preference between them. **Adam**, the usual optimizer, only pushes the answers to be less wrong at each step. What decides here is **weight decay**: at every step the training also pulls the numbers a little towards zero. A table needs big numbers, one for each stored answer, while addition needs smaller ones. So the table becomes more expensive as the run goes on, and the cheaper solution wins.

This figure shows it:

![Size of the numbers and accuracy against the training step, each on its own axis. The size falls from 18.9 to 8.8 in 250 steps, climbs to 11.0 while the model memorizes, then settles at 9.3. The accuracy on unseen sums rises from 1.8% to 100%.](/blog/grokking-norm.svg)

The size falls from 18.9 to 8.8 in the first 250 steps, climbs to 11.0 while the network memorizes, and settles at 9.3 when addition takes over.

## Where the decay goes

The same decay gives different results depending on where it is applied. Here it is applied as part of the same update that each step makes. The other common way is to shrink the numbers after the step, and that is what the **AdamW** optimizer does. With AdamW this run never learns addition: it ends at 30.9% of the unseen sums, the same accuracy as the run with no decay at all, and their size ends at about 56 instead of 9.3.

So weight decay means two different things, and one of them does nothing here.

## The control

With the decay at zero the network memorizes the 843 sums and stops there. The unseen number moves between 30.6% and 30.9% from step 2,000 to step 20,000, and their size grows to 61 because nothing charges for them. With the decay, the same run ends at 100%, with a size of 9.3.

## The model

The network is the one from [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), by Andrej Karpathy: a transformer with one layer. TorchSharp works out how much to change each number after every answer, so the model is one class and the training loop is a handful of lines.

## Reproduce it

You need the .NET SDK 11 or newer. The first build downloads PyTorch's native library, a few hundred megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
make run
```

The run takes about 90 seconds and writes a CSV with one row per step and the figures of this article. The last 2,000 of its 20,000 steps make the changes smaller and smaller, down to zero, so the run stops on the solution it found instead of jumping around it.

Once the network is trained, `make save` writes it to disk and `make infer` asks for a sum:

```bash
make infer PAIR=12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (89%), 21 (2%), 52 (2%)
```

`12 + 35` is one of the sums held back from training, so the 89% on `47` is addition at work, not a stored answer.

## What I take from this

Accuracy on the training sums says little on its own. In this run, weight decay decides between a table and the rule.

I am not a machine learning researcher. This is a small experiment I could reproduce from end to end, understand, and enjoy watching move. The code, the data and the logs are in
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
so that anyone who wants to see it happen can run it in a minute and a half.
