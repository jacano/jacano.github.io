---
title: 'Tokens per Second in Hermes Agent'
date: '2026-09-21'
tag: 'AI Tooling'
excerpt: 'Hermes Agent shows tokens per second in the terminal and in a desktop app. This article shows how I installed it, how I plugged in the same OpenCode Go and Command Code subscriptions, and where I switch the speed readout on.'
---

> **Version record — checked 23 September 2026.** The exact version used for the original test was not recorded. The [Hermes Agent release page](https://github.com/NousResearch/hermes-agent/releases) lists `v0.21.1` (`v2026.9.7`); I have not re-tested every step in this article against that release. Check the current release notes and documentation before you follow the commands.

In my last article I set up **DeepSeek Harness** because it shows **tokens per second** in the web UI. That number is still the point. Agent work is many calls in a row. A model that writes 15 tokens per second feels broken. A model that writes 80 feels fast.

The two subscriptions stay the same, **OpenCode Go** and **Command Code**, and I try a second harness: **Hermes Agent** from [Nous Research](https://nousresearch.com). It also shows the speed number, in two places: the terminal and a desktop app. There is no series here: these pieces are notes from the same learning process, and each one stands alone.

The nice surprise: both providers ship **built in**. In DSH I wrote two provider blocks in YAML. In Hermes I wrote zero.

---

## What you need

- A terminal on **macOS, Linux, or Windows**.
- **One model subscription.** I use **OpenCode Go** and **Command Code**. One is enough to start.
- The API keys of the providers you use.

Hermes is a **harness**, not a model. It brings no account and no key. The repo is [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) and the docs live at [hermes-agent.nousresearch.com/docs](https://hermes-agent.nousresearch.com/docs/).

---

## Install Hermes

On macOS, Linux, or WSL2, one line:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

On Windows, native and with no WSL, the same install comes as one PowerShell line:

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

The installer does the rest on every platform. It sets up `uv`, Python 3.11, ripgrep, and ffmpeg. It clones the agent into `~/.hermes` (`%LOCALAPPDATA%\hermes` on Windows), creates the config, and syncs about 58 skills.

Open a new terminal, so the PATH change lands, and check:

```bash
hermes --version
```

The installer starts a setup wizard at the end. You can leave it for later; the next steps cover everything this article needs.

---

## The desktop app

Hermes has a CLI, a modern TUI, a web dashboard, and bridges for Telegram, Discord, Slack and more. It also has a **desktop app** for macOS, Windows, and Linux:

```bash
hermes desktop
```

The first run compiles an Electron app and opens it. The app talks to the same agent core. Same config, same keys, same sessions. A chat that starts in the terminal resumes in the app.

---

## The providers are built in

This is the part I like most. Both of my subscriptions are already first-class providers in Hermes:

| Subscription | Provider id | Env var |
| --- | --- | --- |
| OpenCode Go | `opencode-go` | `OPENCODE_GO_API_KEY` |
| Command Code | `commandcode` | `COMMANDCODE_API_KEY` |

Two details that DSH made me handle by hand, Hermes handles alone:

- **The session header.** OpenCode Go rejects requests without `x-opencode-session`. Hermes sends it on every call and generates one key per conversation. I do not write the header anywhere.
- **The wire per model.** Some OpenCode models answer only on the OpenAI **Responses** API, such as `muse-spark-1.3-contributor`. Hermes picks the wire per model. I do not split the provider in two routes as I did in DSH.

---

## Set the keys

Hermes reads `~/.hermes/.env`. Note the variable name: Hermes wants `OPENCODE_GO_API_KEY`, not `OPENCODE_API_KEY` as DSH did. The key value is the same OpenCode Go key.

```bash
OPENCODE_GO_API_KEY=your-open-code-go-key
COMMANDCODE_API_KEY=your-command-code-key
```

---

## Pick the default model

Either run the picker:

```bash
hermes model
```

Or write the default straight into the config:

```bash
hermes config set model.provider opencode-go
hermes config set model.default muse-spark-1.3-contributor
```

One warning: models with a `-contributor` suffix cost less because the vendor may train on the traffic. Hermes asks for confirmation before it selects one. Read the notice and decide.

---

## Turn the speed readout on

**Terminal (CLI and TUI).** Nothing to do. The status bar shows latency and speed after the first calls:

```
◷ 2.3s  ↑ 87 t/s
```

**Desktop app.** The status bar at the bottom hides it by default:

1. Right-click the status bar.
2. Choose **Show in status bar** → **Tokens per second**.

The same menu offers the **cache hit rate**. That one is worth it too: it shows the share of the prompt that the provider serves from its cache, and a session gets cheaper as that number grows.

---

## How Hermes measures it

The readout is the average over the **last 10 model calls**: output tokens divided by the full call time. Two consequences:

- It includes the wait before the first token. A reasoning model that thinks for a while shows a lower number than its raw write speed.
- It is a rolling session average, not a per-message value.

DSH measures a different slice: only the decode window, from the first token to the end, and it shows the time to the first token as its own number. So the two harnesses print different values for the same call. The purpose is the same. A slow model is a fact, not a feeling.

---

## Wrap up

Hermes Agent keeps my subscriptions, installs on the three desktop platforms, and shows the speed number in the terminal and in the desktop app. The setup cost is two env vars and two config lines:

- Hermes Agent: [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent).
- Docs: [hermes-agent.nousresearch.com/docs](https://hermes-agent.nousresearch.com/docs/).
- OpenCode Go: [opencode.ai/docs/go](https://opencode.ai/docs/go/).
- Command Code: [commandcode.ai](https://commandcode.ai).
- Another piece on the same two subscriptions: [DeepSeek Harness with OpenCode Go and Command Code](/blog/deepseek-harness-opencode-commandcode/).
