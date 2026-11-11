---
title: 'Grokking: the jump from memory to rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small transformer memorizes 843 sums, fails most unseen ones for a thousand steps, and then learns to add. It ends with every pair it has never seen.'
lang: 'en'
pair: 'grokking-from-memory-to-rule'
---

A transformer with 56,320 parameters learns modular addition. After 1,000 steps it answers 93% of its training pairs correctly and 32% of the pairs it has never seen. Guessing would give it 1.9%. It has memorized 843 sums and, for most of them, learned nothing.

The gap closes over the next two thousand steps. By step 3,000 it answers 94% of the unseen pairs, by step 5,000 it is at 99%, and from step 7,500 it answers all of them. The run ends at **100%**: 1,966 of the 1,966 pairs it never saw.

That delayed jump is **grokking**. The name comes from [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), which reported it in small networks trained on small algorithmic datasets. The architecture is the transformer from [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (Vaswani et al., 2017). The whole experiment is two C# files and takes about 90 seconds on one core.

## The task

The modulus is 53. The model reads a sum and returns the result modulo 53, so every answer is a number from 0 to 52.

```
12 + 35 = 47           already below 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

There are 2,809 pairs in total. I train on 30% of them and hold back the rest, so the unseen pairs are the only evidence that the model learned arithmetic rather than a lookup table.

| Property | Value |
| --- | ---: |
| Modulus | 53 |
| Pairs | 2,809 |
| Training pairs (30%) | 843 |
| Unseen pairs (70%) | 1,966 |
| Vocabulary | 56 tokens |
| Document length | 6 tokens |
| Prediction positions | 5 |
| Parameters | 56,320 |
| Training steps | 20,000 |
| Accuracy by guessing | 1.9% |

The vocabulary is 56 entries: the 53 numbers, `+`, `=`, and a start token. Each number is one token, so an operand arrives whole instead of digit by digit.

A document is a single sequence, and the model predicts every next token in it. Only the last prediction is the task:

| Position | Token | Role |
| ---: | :---: | --- |
| 1 | `[START]` | start of the document |
| 2 | `12` | first operand |
| 3 | `+` | the operator |
| 4 | `35` | second operand |
| 5 | `=` | the input at the answer position |
| 6 | `47` | **the target** |

## The cliff

![Train and unseen accuracy against the training step. Train accuracy reaches 93% at step 1,000, while unseen accuracy is at 32%. Unseen accuracy rises to 94% at step 3,000, 99% at step 5,000, and stays at 100% from step 7,500 to the end.](/blog/grokking-cliff.svg)

The blue line is accuracy on the training pairs. The red line is accuracy on the unseen pairs.

Training accuracy reaches **93% at step 1,000** and stays between 78% and 100% after that. Unseen accuracy is 32% at that point, and it climbs slowly for another 2,000 steps. Then it moves: **94% at step 3,000**, 98% at 4,000, 99% at 5,000, and 100% from step 7,500 to the end.

The flat part of that curve is the part worth understanding. The model is not stuck. It is changing its mind.

The loss on the answer tells the same story. It starts at 4.1, the value of a uniform guess over 53 answers, and falls to 0.1 on the training pairs by step 2,000. The loss on the unseen pairs stays above 2.0 until step 3,000, and then falls to 0.13:

![Cross-entropy loss on the answer, on a log scale. The train loss falls from 4.1 to 0.1 by step 2,000, while the unseen loss stays above 2.0 until step 3,000 and then falls to 0.13.](/blog/grokking-loss.svg)

The loss is one number that says how wrong the model was. It depends on the probability the model gave to the correct answer: at 100% the loss is 0.0, at 50% it is 0.7, at 10% it is 2.3, at 1% it is 4.6. The rule is called **cross-entropy**, and it never goes below zero.

That probability is a softmax over all 53 answers, so it is not the model's private opinion of the right answer: raising the score of any wrong answer takes probability away from the right one and raises the loss. That is why a confidently wrong model scores worse than a hesitant one.

## What seems to cause the jump

Two solutions fit the training data, and only one of them generalizes.

The first is a lookup table: store each of the 843 pairs. It fits fast and says nothing about a pair that is not in it.

The second is the arithmetic. It fits only once the model finds an internal representation that computes it, and then it answers the unseen pairs as well as the training ones.

The optimizer knows about neither. It reduces a loss and nothing else. In this run, what tips the balance is **weight decay**: at every step, the optimizer also pulls each parameter slightly towards zero.

A lookup table needs large parameters, one entry per stored answer. The structured solution needs less. So the table gets more expensive as the steps go by, and once the rule is the cheaper option, gradient descent drifts into it. Measured as one number for the whole model, the size of the parameters falls from 18.9 to 8.8 in the first 250 steps, climbs to 11.0 while the model memorizes, and settles at 9.3 as the rule takes over:

![Two curves against the training step, each on its own axis. On the left axis the size of the parameters falls from 18.9 to 8.8 in 250 steps, climbs to 11.0 while the model memorizes, then settles at 9.3. On the right axis the accuracy on unseen pairs rises from 1.8% to 100%.](/blog/grokking-norm.svg)

For what the model ends up computing, the follow-up work on this task is worth reading: [Progress measures for grokking via mechanistic interpretability](https://arxiv.org/abs/2301.05217) (Nanda et al., 2023) takes the same toy problem apart and finds a small set of periodic features rather than a table.

## The control

If decay is what selects the rule, removing it should break the run. It does.

| step | decay | train acc | unseen acc | size |
| ---: | :--- | ---: | ---: | ---: |
| 2,000 | with | 98.8% | 64.0% | 10.7 |
| 2,000 | without | 100% | 30.6% | 36.2 |
| 4,000 | with | 99.8% | 98.1% | 9.7 |
| 4,000 | without | 100% | 30.6% | 41.0 |
| 12,000 | with | 100% | 100% | 9.4 |
| 12,000 | without | 100% | 30.8% | 53.0 |
| 20,000 | without | 100% | **30.9%** | 61.2 |

Without decay the model memorizes every training pair and answers 30.9% of the unseen ones. It stays there: the accuracy moves between 30.6% and 30.9% from step 2,000 to step 20,000, and the size of the parameters climbs to 61 because nothing in the run charges for it.

So the jump is not a slow learner arriving late. Without decay, nothing in this run prefers the cheaper solution, and more steps do not change that. They only make the table bigger.

## The model

The model is the one from [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95) by Andrej Karpathy: one layer, 64 dimensions, 8 heads, RMSNorm instead of LayerNorm, no biases, ReLU instead of GeLU. Attention lets each position read the earlier ones. The MLP transforms what it read. Both add their result back to their input, so the signal has a straight path through the layer.

There is no positional embedding. The token already says which operand it is, because `a` comes before `+` and `b` comes after it. Addition is symmetric, so a second table that tells the two slots apart adds parameters and nothing else.

That is the whole architecture. The rest of the repository is the training loop, the dataset and the figures; TorchSharp supplies the automatic differentiation, so the model is one class and the loop is a handful of lines. The repository also writes down the three settings that took me longest to get right.

## Reproduce it

You need the .NET SDK 11 or newer. The first build downloads PyTorch's native library, a few hundred megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
make run
```

`make` on its own compiles and runs the style check; it does not train. `make` does not ship with Windows, and every target has a `dotnet` form for that case: `dotnet run -c Release` where the target says `make run`.

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
| `train_loss` | cross-entropy on the answer over 512 training pairs |
| `train_acc` | exact match on those pairs |
| `test_loss` | cross-entropy on the answer over all 1,966 unseen pairs |
| `test_acc` | exact match on the unseen pairs |
| `param_norm` | L2 norm of all 56,320 parameters: the square root of the sum of their squares |

The repository has a `Makefile` with one target per action. `make help` lists them, and the two worth knowing here are:

| command | what it does |
| --- | --- |
| `make control` | the same run with the decay at zero, which never learns the rule |
| `make run ARGS="--p 13 --steps 3000"` | another modulus, or another number of steps |

The defaults are a learning rate of 0.003, a decay of 0.005, and 20,000 steps. The last 2,000 steps take the learning rate to zero, so the run settles on the solution it found instead of ending on an oscillation. A slower seed needs more steps: the same model reaches 100% with `--steps 44000 --anneal 4000`.

## Ask the model a sum

Training does not keep the model, so the first step is to write it to disk:

```bash
make save
```

That leaves `model.pt` in the repository folder. `make infer` loads it and asks for one sum:

```bash
make infer PAIR=12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (89%), 21 (2%), 52 (2%)
```

The model reads `[START, 12, +, 35, =]` and returns one probability for every answer it could give. The line prints the three highest. `12 + 35` is one of the pairs held back from training, so the 89% on `47` is the rule at work and not a stored answer.

To see all 53 answers instead of three:

```bash
make explain PAIR=12+35
```

That writes them to `runs/probabilities.csv` and draws them in `figures/grokking-probabilities.svg`.

## What I take from this

- **Training accuracy says very little on its own.** It reaches 93% here while the accuracy on unseen pairs sits at 32%.
- **The run behaves like a transition between two answers.** One stores the pairs and needs large parameters; the other computes the rule and needs less.
- **In this run, weight decay is what tips it.** With decay the jump arrives; at zero it never does, in the 20,000 steps I tried, on one seed and one modulus.
- **The size of the parameters moved first,** in both directions: down at once, up while the model memorized, and down again as the rule took over.

I am not a machine learning researcher. This is a small experiment I could reproduce from end to end, understand, and enjoy watching move. The code, the data and the logs are in
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
so that anyone who wants to see it happen can run it in a minute and a half.
