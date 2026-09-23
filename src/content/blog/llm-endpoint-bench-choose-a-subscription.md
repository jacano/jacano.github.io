---
title: 'Which AI subscription to keep: I built a benchmark to decide'
date: '2026-09-23'
tag: 'AI Tooling'
excerpt: 'Two agent subscriptions cost about the same each month, and I wanted to keep one. So I wrote a small benchmark and measured both routes the way an agent uses them: the delay on every call, and the speed of the answer.'
---

I pay for two AI subscriptions for agent work: **OpenCode Go** and **Command Code**. They cost about the same each month. For a personal setup I do not need both, so one stays as my main route and the other goes to pause.

The question is which one. The price does not answer it, because the price is almost the same. My impression does not answer it either. I noticed that I blamed the network when a session felt slow, and I had no number to check that feeling against.

So I wrote a small benchmark and measured both routes the way I use them.

This article is the third entry in the same notebook. The first two set up **DeepSeek Harness** and **Hermes Agent** on these same two subscriptions. This one decides between them.

> **The numbers and the raw records are open.** Every number here comes from four campaigns on one Windows 11 host on 23 September 2026. The tool, the raw records, the tables and the limits are in [github.com/jacano/llm-endpoint-bench](https://github.com/jacano/llm-endpoint-bench). Run `python bench.py ab --a commandcode --b opencode-go --n 4` to reproduce a campaign on your own machine.

---

## The two subscriptions

Both routes are OpenAI-compatible gateways over the same model, `deepseek-v4.1-flash`. The model is identical, so the difference I can measure is the route around it.

| | OpenCode Go | Command Code |
| --- | --- | --- |
| Base URL | `https://opencode.ai/zen/go/v1` | `https://api.commandcode.ai/provider/v1` |
| Model id | `deepseek-v4.1-flash` | `deepseek/deepseek-v4.1-flash` |
| Extra header | `x-opencode-session` | none |

Both serve the model well. A person cannot tell them apart by reading an answer. The difference lives in the wait before the answer and in the speed of the writing.

---

## Why these numbers matter for agent work

An agent session is not one question. It is many calls in a row: read a file, plan, edit, run the tests, read the output, edit again. Sixty calls in one afternoon is a normal day, and every one of them crosses the gateway.

Three numbers decide how that day feels.

- **The fixed delay of the route.** It is there before the model starts to think, on every call. It does not shrink when the prompt grows or when the answer is short. At sixty calls, a route that adds 300 ms of overhead costs eighteen seconds of pure waiting, before any thinking happens.
- **Tokens per second.** This is the write speed. An edit of 500 visible tokens takes 1.1 seconds at 450 tokens per second, and 1.9 seconds at 260. In a loop that writes code all afternoon, the slower route costs minutes, and it costs them at the moment when you wait for the result.
- **Behaviour under parallel load.** Harnesses run subagents and several tool calls at once. A route that holds its speed when four requests arrive keeps the session moving.

There is a fourth point, and it comes from the two articles before this one. **Tokens per second turns a feeling into a fact.** "The model feels slow today" is not actionable. "This route writes at 260 tokens per second and the other at 446" is a number I can act on.

For agentic coding, the best route is the one with the smallest fixed delay and the highest sustained write speed. It is not the route with the best answer to a single clever prompt. Both routes here answer equally well, and the slow one would make the agent feel broken.

---

## What the benchmark measures

The tool runs four phases and uses `curl` for every request, so no client library hides the slow end of the distribution.

| Phase | What it asks for | What it reports |
| --- | --- | --- |
| `transport` | the list of models, on a new connection and on a ready one | DNS, TCP, TLS, and the time to the first byte |
| `short` | one tiny reply | the delay to the first token |
| `long` | one answer of about 500 visible tokens | the delay to the first token, the delay to the first visible token, the total time, and the write speed |
| `concurrent` | four requests at the same time | the rate of one request, and the aggregate rate |

Three rules keep the comparison honest:

- Both sides run in the same session, in an interleaved order. A slow moment of one provider therefore hits both sides.
- The tool reads every token count from the `usage` block of the response. It never estimates.
- It refuses a verdict when a side has fewer than three samples, or when a rate rests on too few tokens. A ratio of 1.6 from one request is not a result.

---

## The results, in short

The table gives the ratio of the two routes in each of the four campaigns. All four ran on the same machine on the same day, so the ratios compare, and the absolute numbers do not.

![OpenCode Go divided by Command Code across four windows. The three delays stay above the line at 1 and move between windows. The two rates stay near 0.6 in every window.](/blog/llm-endpoint-bench-ratios.svg)

| OpenCode Go divided by Command Code | 15:34Z | 20:42Z | 21:02Z | 21:23Z |
| --- | --- | --- | --- | --- |
| First byte of the server, ready connection | 11.77 | 9.11 | 20.58 | 10.95 |
| Short answer: first token | 1.75 | 2.20 | 2.16 | 2.42 |
| Long answer of 500 visible tokens: total time | 1.94 | 1.66 | 1.86 | 1.41 |
| Long answer: tokens per second | 0.63 | 0.59 | 0.61 | 0.65 |
| One request under four parallel requests: tokens per second | 0.62 | 0.63 | 0.60 | 0.66 |

A number above 1 is a delay where OpenCode Go waits longer. A number below 1 is a rate where OpenCode Go is slower.

Two things stand out.

**The delays move. The rates do not.** The gap in the first byte of the server moved between 9.11 and 20.58 across the four windows, and the gap in the delay of a short answer moved between 1.75 and 2.42. The write speed barely moved: 0.63, 0.59, 0.61, 0.65. So a delay measured once is worth less than a rate measured four times.

**The fixed cost is the gateway.** In the last campaign, one request to the server on a ready connection needed **27 ms on Command Code and 297 ms on OpenCode Go**. A new TLS connection added **41 ms against 273 ms**. That cost is there before the model writes a single token, and it lands on every call of a session. The model itself is closer: **754 ms against 1822 ms** to the first token of a short answer, and **446 tokens per second against 292** on the visible content of a long answer.

---

## The decision

Command Code was faster on every measurement, in all four campaigns. The gap is not one dramatic number. It is a smaller delay on every call, and a higher write speed on every answer. In an agent loop, that is the difference between a session that flows and a session that waits.

So the numbers point one way: **Command Code stays as my main route, and OpenCode Go goes to pause.**

The honest part: this is my decision for my machine. Another person may prefer the other route for its other models, its price per token, or its rules about training data. The benchmark measures the route, and it measures only what I asked it to measure.

---

## Limits

- One host, one network path, four windows of one day. The absolute values do not transfer to another machine.
- The queue of a provider moves hour by hour. The size of a difference is not a constant, and only the direction held across my four windows.
- Not measured: retries, tool calls, streaming with tools, very long context, image input, and price per million tokens.
- A measurement goes stale. I run a campaign again when a provider changes something.

---

## Wrap up

The tool is small on purpose: one Python file, `curl`, no dependency, and one directory of raw records per campaign.

- The tool and the records: [github.com/jacano/llm-endpoint-bench](https://github.com/jacano/llm-endpoint-bench)
- The analysis of the four campaigns, with the limits: [ANALYSIS.md](https://github.com/jacano/llm-endpoint-bench/blob/main/ANALYSIS.md)
- OpenCode Go: [opencode.ai/docs/go](https://opencode.ai/docs/go/)
- Command Code: [commandcode.ai](https://commandcode.ai)
- The previous article: [Tokens per Second in Hermes Agent](/blog/hermes-agent-tokens-per-second/)
