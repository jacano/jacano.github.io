---
title: 'Which AI subscription to keep: I built a benchmark to decide'
date: '2026-09-23'
tag: 'AI Tooling'
excerpt: 'I measured two $10 agent subscriptions from Seville, using the same model and four test phases, to decide which route to keep.'
---

I pay for two AI subscriptions for agent work: **Command Code** and **OpenCode Go**. Both cost **$10 a month**, so price does not separate them. I do not need both for my personal setup, so one will remain my main route and I will pause the other.

I needed a way to choose between them. Price was no help because both plans cost the same, and my impression was unreliable. When a session felt slow, I blamed the network without a number to test that assumption.

I wrote a small benchmark and measured both routes from my home connection in [Seville](https://en.wikipedia.org/wiki/Seville), in the south of Spain. The numbers include my distance to each gateway, so they describe my setup, not a universal ranking.

I had already used both subscriptions with **DeepSeek Harness**, in the browser and in the desktop app. This benchmark answers a more practical question: which route should I keep paying for?

> **The numbers and the raw records are open.** Every number here comes from four rounds of the same test on one Windows 11 host on 23 September 2026. A round is one full execution of the test: both routes, the same four phases, one after the other, in one sitting. Each round leaves its own directory of records in the repository. The tool, the raw records, the tables and the limits are in [github.com/jacano/llm-endpoint-bench](https://github.com/jacano/llm-endpoint-bench). Run `python bench.py ab --a commandcode --b opencode-go --n 4` to measure your own two routes, and compare your table with mine.

## The two subscriptions

Both routes are OpenAI-compatible gateways over the same model, `deepseek-v4.1-flash`. The comparison below lists Command Code first, followed by OpenCode Go. The model is identical, so the difference I can measure is the route around it.

**Command Code, the GOAT plan** — the plan I pay for, at [commandcode.ai/docs/plans/goat](https://commandcode.ai/docs/plans/goat). $10 a month.

- It speaks on `https://api.commandcode.ai/provider/v1`.
- The model id is `deepseek/deepseek-v4.1-flash`. Note the prefix.
- It needs no extra header.
- The plan gives $70 of credits, a 7x multiplier.

**OpenCode Go** — the low cost plan of the OpenCode team, at [opencode.ai/docs/go](https://opencode.ai/docs/go/). $10 a month, and $5 for the first one.

- It speaks on `https://opencode.ai/zen/go/v1`.
- The model id is `deepseek-v4.1-flash`.
- It needs one extra header, `x-opencode-session`.
- The plan gives about $60 of usage for the $10.

Same price, same model, same kind of plan. Both serve the model well, and a person cannot tell them apart by reading an answer. The difference lives in the wait before the answer and in the speed of the writing.

## Why these numbers matter for agent work

An agent session is a chain of calls: read a file, plan, edit, run tests, read the output, then edit again. Every call crosses the provider gateway, so small delays add up.

Three numbers decide how that day feels.

- **The fixed delay of the route.** It is there before the model starts to think, on every call. It does not shrink when the prompt grows or when the answer is short. At sixty calls, a route that adds 300 ms of overhead costs eighteen seconds of pure waiting, before any thinking happens.
- **Tokens per second.** This is the write speed. An edit of 500 visible tokens takes 1.1 seconds at 450 tokens per second, and 1.9 seconds at 260. In a loop that writes code all afternoon, the slower route costs minutes, and it costs them at the moment when you wait for the result.
- **Behaviour under parallel load.** Harnesses run subagents and several tool calls at once. A route that holds its speed when four requests arrive keeps the session moving.

There is a fourth point, and it comes from the article before this one. **Tokens per second turns a feeling into a fact.** "The model feels slow today" is not actionable. "This route writes at 260 tokens per second and the other at 446" is a number I can act on.

For agentic coding, the best route is the one with the smallest fixed delay and the highest sustained write speed. It is not the route with the best answer to a single clever prompt. Both routes here answer equally well, and the slow one would make the agent feel broken.

## What the benchmark measures

The tool runs four phases and uses `curl` for every request, so no client library hides the slow end of the distribution.

**`transport`** asks the list of models, on a new connection and on a ready one, and reports DNS, TCP, TLS, and the time to the first byte.

**`short`** asks for one tiny reply, and reports the delay to the first token.

**`long`** asks for one answer of about 500 visible tokens, and reports the delay to the first token, the delay to the first visible token, the total time, and the write speed.

**`concurrent`** sends four requests at the same time, and reports the rate of one request and the aggregate rate.

Three rules keep the comparison honest:

- Both sides run in the same session, in an interleaved order. A slow moment of one provider therefore hits both sides.
- The tool reads every token count from the `usage` block of the response. It never estimates.
- It refuses a verdict when a side has fewer than three samples, or when a rate rests on too few tokens. A ratio of 1.6 from one request is not a result.

## The results, in short

The five headline measurements are below, followed by the charts and full comparison.

![Head to head of one round. Command Code against OpenCode Go: the first byte of the server on a ready connection in 27 and 297 milliseconds, the first token of a short answer in 754 and 1822, the total time of a long answer in 2839 and 4006, the writing speed of the visible content at 446 and 292 tokens per second, and four parallel requests at 902 and 424 tokens per second. Command Code is faster on five of five.](/blog/llm-endpoint-bench-head-to-head.svg)

Those numbers are mine, measured from one city. Take them with a grain of salt: the distance from your desk to a gateway is not the distance from mine, and it moves a delay far more than it moves a write speed.

Then the same measurements again, across the four rounds. The table gives one number for each one: how many times faster Command Code was. All four rounds ran on the same machine on the same day, so the ratios compare, and the absolute numbers do not.

![Command Code against OpenCode Go across four rounds, how many times faster. Every value sits above the line at 1, so a taller line is a bigger gain for Command Code. The first byte of the server swings between 9.1 and 20.6 times, and the four other measurements stay between 1.4 and 2.4 times.](/blog/llm-endpoint-bench-ratios.svg)

| Command Code is faster by | 15:34Z | 20:42Z | 21:02Z | 21:23Z |
| --- | ---: | ---: | ---: | ---: |
| Time to the first byte | 11.8× | 9.1× | 20.6× | 11.0× |
| Time to the first token | 1.7× | 2.2× | 2.2× | 2.4× |
| Total time of a long answer | 1.9× | 1.7× | 1.9× | 1.4× |
| Writing speed | 1.6× | 1.7× | 1.6× | 1.5× |
| Four requests at once | 1.6× | 1.6× | 1.7× | 1.5× |

Every number is how many times faster Command Code was, so a bigger number is always a bigger gain for Command Code. The first three rows are waits: the number is how much longer OpenCode Go kept you waiting. The last two are speeds: the number is how much more Command Code wrote in the same second. The first of those two counts only the visible content, the second counts every token, reasoning included.

Two patterns stand out.

**The waits move. The speeds do not.** The first byte of the server moved between 9.1 and 20.6 times across the four rounds, and the first token of a short answer moved between 1.7 and 2.4 times. The write speed barely moved: 1.6, 1.7, 1.6, 1.5. So a wait measured once is worth less than a speed measured four times.

**The fixed cost is the gateway.** In the last round, one request to the server on a ready connection needed **27 ms on Command Code and 297 ms on OpenCode Go**. A new TLS connection added **41 ms against 273 ms**. That cost is there before the model writes a single token, and it lands on every call of a session. The model itself is closer: **754 ms against 1822 ms** to the first token of a short answer, and **446 tokens per second against 292** on the visible content of a long answer.

## The decision

Command Code was faster on every measurement, in all four rounds. The gap is not one dramatic number. It is a smaller delay on every call, and a higher write speed on every answer. In an agent loop, that is the difference between a session that flows and a session that waits.

The card below is the decision in one view: two plans at the same price, one model, and what the four rounds found.

![Decision card. Both plans cost $10 a month. Command Code gives $70 of credits with a 7x multiplier and it is the plan I keep. OpenCode Go gives about $60 of usage and goes to pause. Both serve deepseek-v4.1-flash. Command Code was faster on every measurement of all four rounds: the delays ran between 9 and 21 times, and the write speed between 1.5 and 1.7 times. Measured from Seville, in the south of Spain, so run the benchmark on your own machine.](/blog/llm-endpoint-bench-decision.svg)

So the numbers point one way: **Command Code stays as my main route, and OpenCode Go goes to pause.**

This is my decision for my machine. Another person may prefer the other route for its other models, its price per token, or its rules about training data. The benchmark measures the route, and it measures only what I asked it to measure.

## Limits

- One host, one network path, four rounds of one day. The absolute values do not transfer to another machine.
- I measured from Seville, in the south of Spain. The distance from my connection to a gateway is part of every delay in the tables. A reader in another region can see a different gap, in either direction. Take the sizes as mine, and check the direction on your own machine.
- The queue of a provider moves hour by hour. The size of a difference is not a constant, and only the direction held across my four rounds.
- Not measured: retries, tool calls, streaming with tools, very long context, image input, and price per million tokens.
- A measurement goes stale. I run a round again when a provider changes something.

## Wrap up

The tool is small on purpose: one Python file, `curl`, no dependency, and one directory of raw records per round.

- The tool and the records: [github.com/jacano/llm-endpoint-bench](https://github.com/jacano/llm-endpoint-bench)
- The analysis of the four rounds, with the limits: [ANALYSIS.md](https://github.com/jacano/llm-endpoint-bench/blob/main/ANALYSIS.md)
- Command Code GOAT plan: [commandcode.ai/docs/plans/goat](https://commandcode.ai/docs/plans/goat)
- OpenCode Go: [opencode.ai/docs/go](https://opencode.ai/docs/go/)
- Every Command Code plan, with the prices: [commandcode.ai/pricing](https://commandcode.ai/pricing)
- The same two subscriptions in DeepSeek Harness: [DeepSeek Harness with Command Code and OpenCode Go](/blog/deepseek-harness-opencode-commandcode/)

Run the benchmark on your own machine and compare your table with mine. Your distance to a gateway is not mine, so a number you measure yourself beats a table you read.