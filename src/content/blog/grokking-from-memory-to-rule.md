---
title: 'Grokking: the jump from memory to rule'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'A small transformer memorizes 843 sums, fails almost every unseen sum for three thousand steps, and then learns to add. This is that run, and the single hyperparameter that decides it.'
lang: 'en'
pair: 'grokking-from-memory-to-rule'
---

A transformer with 56,640 parameters learns modular addition. After 1,000 steps it answers 98% of its training pairs correctly and 1.2% of the pairs it has never seen. Guessing would give it 1.9%. It has memorized 843 sums and learned nothing.

It stays there for another two thousand steps. Training accuracy is already at its ceiling, so every summary of the run looks finished. Then, between step 3,500 and step 3,750, the accuracy on unseen pairs goes from 28% to 74%, and by step 5,000 it is 92%. The run ends at 97.3%, which is 1,912 of the 1,966 pairs it never saw.

That delayed jump is **grokking**. The name comes from [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), which reported it in small networks trained on small algorithmic datasets. The architecture is the transformer from [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (Vaswani et al., 2017). The whole experiment is 329 lines of C# and takes 26 seconds on one core.

## The task

The modulus is 53. The model reads a sum and returns the result modulo 53, so every answer is a number from 0 to 52.

```
12 + 35 = 47           already below 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

There are 2,809 pairs in total. I train on 30% of them and hold back the rest, so the held-back pairs are the only evidence that the model learned arithmetic rather than a lookup table.

| Property | Value |
| --- | ---: |
| Modulus | 53 |
| Pairs | 2,809 |
| Training pairs (30%) | 843 |
| Held-back pairs (70%) | 1,966 |
| Vocabulary | 56 tokens |
| Document length | 6 tokens |
| Prediction positions | 5 |
| Parameters | 56,640 |
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

![Train and unseen accuracy against the training step. Train accuracy reaches 98% by step 1000 while unseen accuracy is at 1.2%. Unseen accuracy rises from 13% at step 3000 to 74% at step 3750 and reaches 97% by step 5000.](/blog/grokking-cliff.svg)

The blue line is accuracy on the training pairs. The red line is accuracy on the held-back pairs.

Training accuracy reaches **98% at step 1,000** and never falls far below it again. Held-back accuracy is 1.2% at that point, and it stays between 1% and 28% for another 2,500 steps. Then it moves: **74% at step 3,750**, 82% at 4,000, 92% at 5,000, and 97.3% at the end.

The flat part of that curve is the part worth understanding. The model is not stuck. It is changing its mind.

Two figures show what that means for a sum the model never saw. At step 1,000, `12 + 35`:

![A bar chart of the 53 answers the model is considering for 12 + 35, after 1,000 steps. The bar for the correct answer, 47, reaches 0.3%, and the tallest bar, for the answer 6, reaches 40%.](/blog/grokking-probs-early.svg)

The right answer gets 0.3%. The model is not undecided: it gives 40% to the answer 6 and 27% to 36. It has an opinion, and the opinion is wrong.

At step 12,000, the same sum:

![The same bar chart after 12,000 steps. The bar for the correct answer, 47, reaches 90%, and every other bar is close to zero.](/blog/grokking-probs-late.svg)

47 gets 90%, and nothing else is close.

**The loss is one number that says how wrong the model was, and it looks at one thing: the probability the model gave to the correct answer.** At 100% it is 0.0; at 50%, 0.7; at 10%, 2.3; at 1%, 4.6. The rule is called **cross-entropy**, and it never goes below zero, so the only way to reduce it is to give the correct answer more probability.

The loss pays no attention to what the model believed instead. A wrong answer held with 40% confidence scores worse than a hesitant guess would, which is why held-back accuracy can sit below chance: the model is not hedging, it is confidently wrong.

## Why the jump happens

Two solutions fit the training data, and only one of them generalizes.

The first is a lookup table: store each of the 843 pairs. It fits fast and says nothing about a pair that is not in it.

The second is the arithmetic. It fits only once the model finds an internal representation that computes it, and then it answers the held-back pairs as well as the training ones.

The optimizer knows about neither. It reduces a loss and nothing else. What decides between the two solutions is **weight decay**: at every step, the optimizer also pulls each parameter slightly towards zero.

A lookup table needs large parameters, one entry per stored answer. The structured solution needs less. So decay makes the table progressively more expensive, and once the rule is the cheaper option, gradient descent walks into it. Measured as one number for the whole model, the size of the parameters climbs from 19.1 to 22.3 while the model memorizes, then falls to 16.0 as the rule takes over:

![Two curves against the training step, each on its own axis. On the left axis the size of the parameters rises from 19.1 to 22.3 while the model memorizes, then falls to 16.0. On the right axis the accuracy on unseen pairs stays near 1% for three thousand steps and then rises to 97%.](/blog/grokking-norm.svg)

The loss tells the same story. Train loss hits its floor early and stays there, while test loss sits near 3.9 for thousands of steps and then drops to 2.0 as the accuracy jumps:

![Cross-entropy loss against the training step, on a log scale. The train loss reaches its floor by step 1000 while the test loss stays near 3.9, then falls to 2.0 as the unseen accuracy jumps.](/blog/grokking-loss.svg)

For what the model ends up computing, the follow-up work on this task is worth reading: [Progress measures for grokking via mechanistic interpretability](https://arxiv.org/abs/2301.05217) (Nanda et al., 2023) takes the same toy problem apart and finds a small set of periodic features rather than a table.

## The control

If decay is what selects the rule, removing it should break the run. It does.

| step | decay | train acc | unseen acc | size |
| ---: | :--- | ---: | ---: | ---: |
| 2,000 | with | 94% | 3.4% | 21.5 |
| 2,000 | without | 99.8% | 0.1% | 74.0 |
| 4,000 | with | 99.6% | 82.2% | 17.0 |
| 4,000 | without | 99.8% | 0.3% | 94.7 |
| 12,000 | with | 100% | **97.3%** | 16.0 |
| 12,000 | without | 100% | **0.2%** | 157.1 |
| 60,000 | without | 100% | **0.5%** | 348.2 |

Without decay the model memorizes the training pairs and answers 0.2% of the held-back ones. Five times the steps do not change the outcome: at 60,000 steps it is at 0.5%, which is a quarter of the 1.9% you get by guessing, and the size of the parameters has grown from 16 to 348 because nothing in the run charges for it.

So the jump is not a slow learner arriving late. Without decay there is no mechanism that prefers the cheaper solution, and more steps do not create one. They only make the table bigger.

## The model

The model is the one from [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95) by Andrej Karpathy: one layer, 64 dimensions, 8 heads, RMSNorm instead of LayerNorm, no biases, ReLU instead of GeLU. Attention lets each position read the earlier ones. The MLP transforms what it read. Both add their result back to their input, so the signal has a straight path through the layer.

That is the whole architecture. The rest of the repository is the training loop, the dataset and the figures; TorchSharp supplies the automatic differentiation, so the model is 55 lines and the loop is 12.

## Two traps

Two details of the run are easy to get wrong, and both change the outcome.

**The initialisation.** TorchSharp starts an embedding at `N(0, 1)` and a linear layer in a uniform range. microgpt uses `N(0, 0.08)`. Measured by the size of the parameters, the framework default puts the run at 69.6 instead of 19.1, which changes what decay has to work against. Four lines set it.

**Adam is not AdamW.** `AdamW` subtracts decay from the weight outside the update; `Adam` adds it to the gradient, which is what microgpt does. With `AdamW` this run never jumped, at any decay between 0.002 and 0.5: the parameter norm settled between 40 and 50 and the model stayed on the memorizing answer. With the decay inside the gradient, `wd = 0.0012` works. Same word, different optimizer, different run.

## Reproduce it

You need the .NET SDK 10 or newer. The first build downloads PyTorch's native library, a few hundred megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
dotnet run -c Release
```

The run takes about half a minute and writes three things:

| Where | What |
| --- | --- |
| `data/train.txt`, `data/test.txt` | the two splits, one pair per line: 843 lines and 1,966 lines |
| `runs/grokking.csv` | the logged numbers of every step |
| `figures/` | the figures in this article |

Each row of the CSV has six columns:

| Column | Meaning |
| --- | --- |
| `step` | training step |
| `train_loss` | mean cross-entropy over 512 training pairs |
| `train_acc` | exact match on those pairs |
| `test_loss` | mean cross-entropy over all 1,966 held-back pairs |
| `test_acc` | exact match on the held-back pairs |
| `param_norm` | size of every parameter, as one number |

The repository carries a `Makefile`, so the same commands run on a laptop and on a runner:

```bash
make run                                  # the run above
make control                              # the same run with the decay at zero
make save                                 # train, then keep the model
make explain PAIR=12+35                   # draw the 53 answers it considers
make run ARGS="--p 13 --steps 3000"       # a smaller modulus learns faster
```

## What to take away

- **Training accuracy is a bad guide.** It reaches 100% while held-back accuracy is at chance, and it stays there for two thousand steps.
- **Grokking is a transition between two solutions.** One stores the answers and needs large parameters; the other computes the rule and needs less. The run sits on the first until the second becomes cheaper.
- **Weight decay picks between them.** Remove it and the run never leaves the table, at any number of steps.
- **Watch the size of the parameters.** It is the cheapest signal of which solution a run is on.

The code, the data and the logs are in
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp).
