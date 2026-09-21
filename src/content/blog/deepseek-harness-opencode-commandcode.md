---
title: 'DeepSeek Harness with OpenCode Go and Command Code'
date: '2026-09-19'
tag: 'AI Tooling'
excerpt: 'DeepSeek Harness shows tokens per second in the web UI, out of the box. This article records how I installed it and how I added my OpenCode Go and Command Code subscriptions as model providers.'
---

I test agent harnesses the way I test editors: I install one, I work with it for a while, and I write down what I find. This article records my test of **DeepSeek Harness** (DSH). The number that stood out at once: **tokens per second**, right in the web UI, with no setup.

That number is not a detail. Agent work is many calls in a row. A model that writes 15 tokens per second feels broken. A model that writes 80 feels fast. Most harnesses hide the speed. DSH shows it.

The second reason is freedom. DSH is a **harness**, not a model. It brings no account and no key. I plug in my own subscriptions, and I keep my own keys.

I found the speed readout in [a post on X by @Ubendev](https://x.com/Ubendev/status/2100920587577446416). I installed DSH the same day.

![DeepSeek Harness session statistics: LLM time, tool time, time to first token, and tokens per second](/blog/deepseek-harness-session-stats.png)

---

## What you need

- **Node.js** 22 or newer. I run Node 24.
- A terminal on macOS, Linux or Windows.
- **One model provider.** Here the providers are an **OpenCode Go** subscription and a **Command Code** account. You do not need both. One is enough to start.

DSH calls the program that runs the agent loop a **harness**, and the brain behind it a **model**. The model plugin speaks the OpenAI-compatible wire, so other providers work too. A free endpoint or a local server, such as Ollama, is enough.

---

## Install DeepSeek Harness

Take a quick look with no install:

```bash
npx @deepseek-ai/dsh web
```

For a permanent install:

```bash
npm install -g @deepseek-ai/dsh
dsh web
```

The web UI listens on `127.0.0.1` and prints a link with a token.

---

## How DSH finds a model

DSH is built from **plugins**. Each plugin owns one section of the settings file, and the section name is the plugin id.

The part that talks to models is the plugin `@deepseek-ai/dsh-llm-pi-ai`. Its settings section is `llm-pi-ai`. It speaks the **OpenAI-compatible** wire and the **Anthropic-compatible** wire.

So every provider goes under one key:

```yaml
llm-pi-ai:
  providers:
    <provider-id>:
      ...
```

The default model lives in its own section, `agent-default-model`.

---

## Set the keys

The settings file never holds a secret. It only names the environment variables that hold the keys:

```bash
export OPENCODE_API_KEY="your-open-code-go-key"
export COMMANDCODE_API_KEY="your-command-code-key"
```

Define only the variables of the providers you add. Open a new terminal after this step.

---

## Step 1: add OpenCode Go

OpenCode Go is an OpenAI-compatible gateway at `https://opencode.ai/zen/go/v1`. It accepts the model `deepseek-v4.1-flash`. It needs one stable session header, `x-opencode-session`. The route reads its key from `OPENCODE_API_KEY`.

---

## Step 2: add Command Code

Command Code has its own OpenAI-compatible endpoint: `https://api.commandcode.ai/provider/v1`. The model id is `deepseek/deepseek-v4.1-flash`. Note the `deepseek/` prefix: OpenCode Go does not use it. The route reads its key from `COMMANDCODE_API_KEY`.

---

## The final settings

Here is the whole `~/.dsh/settings.yaml`:

```yaml
ui-onboarding:
  welcomeNoticeVersion: 2026-08-13.1
permission:
  defaultPreset: danger-full-access
ui-theme:
  preference: dark
agent-default-model:
  provider: opencode-go
  model: deepseek-v4.1-flash
llm-pi-ai:
  providers:
    opencode-go:
      displayName: OpenCode Go
      api: openai-completions
      baseURL: https://opencode.ai/zen/go/v1
      apiKeyEnv: OPENCODE_API_KEY
      headers:
        x-opencode-session: ses_dsh_8f2a1c4e7b6d4a90
      defaultContextWindow: 1048576
      defaultMaxTokens: 32768
      models:
        - id: deepseek-v4.1-flash
          name: DeepSeek V4.1 Flash
          contextWindow: 1048576
          maxTokens: 32768
    command-code:
      displayName: Command Code
      api: openai-completions
      baseURL: https://api.commandcode.ai/provider/v1
      apiKeyEnv: COMMANDCODE_API_KEY
      defaultContextWindow: 1000000
      defaultMaxTokens: 32768
      models:
        - id: deepseek/deepseek-v4.1-flash
          name: DeepSeek V4.1 Flash (Command Code)
          contextWindow: 1000000
          maxTokens: 32768
```

Start `dsh web` again. The model menu shows two groups, **OpenCode Go** and **Command Code**, and I pick the model per session. The `agent-default-model` block sets it for a new session. To make Command Code the default, change two lines:

```yaml
agent-default-model:
  provider: command-code
  model: deepseek/deepseek-v4.1-flash
```

---

## The context window

The two routes show 1,048,576 for OpenCode Go and 1,000,000 for Command Code, because each API reports its own number:

- Command Code returns `context_length: 1000000`.
- OpenCode Go does not publish it, so I use 1,048,576, the binary 1M that DeepSeek uses.

The number is metadata for the history compaction and for the display. The real limit lives on the server.

---

## Before DSH

Before DSH I used two native desktop apps: [OpenCode Desktop](https://opencode.ai/download) and [Command Code Desktop](https://github.com/CommandCodeAI/desktop). Both talk to the same subscriptions and keep the same keys. Neither showed tokens per second. When a model felt slow, I blamed the network.

DSH adds the number. Now a slow model is a fact, not a feeling.

---

## Wrap up

DSH is local and plugin-based. It keeps my subscriptions, the settings are one YAML file, and a new provider is a small block:

- DeepSeek Harness: [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).
- OpenCode Go: [opencode.ai/docs/go](https://opencode.ai/docs/go/).
- Command Code: [commandcode.ai](https://commandcode.ai).
