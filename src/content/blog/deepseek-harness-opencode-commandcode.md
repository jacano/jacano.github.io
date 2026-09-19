---
title: 'DeepSeek Harness with OpenCode Go and Command Code'
date: '2026-09-19'
tag: 'AI Tooling'
excerpt: 'I run DeepSeek Harness as my coding agent. It shows tokens per second in the web UI, out of the box. This article shows how I installed it and how I added my OpenCode Go and Command Code subscriptions as model providers.'
---

I use **DeepSeek Harness** (DSH) as my coding agent. One number keeps me there: **tokens per second**, right in the web UI, with no setup.

That number is not a detail. Agent work is many calls in a row. A model that writes 15 tokens per second feels broken. A model that writes 80 feels fast. Most harnesses hide the speed. DSH shows it, out of the box.

The second reason is freedom. DSH is a **harness**, not a model. It brings no account and no key. I plug in my own subscriptions, and I keep my own keys. This article shows exactly how.

I found the speed readout in [a post on X by @Ubendev](https://x.com/Ubendev/status/2100920587577446416). One screenshot was enough. I installed DSH the same day, and I moved my daily work to it.

---

## What you need

- **Node.js** 22 or newer. I run Node 24.
- A terminal on macOS, Linux or Windows.
- **One model provider.** In this article the providers are an **OpenCode Go** subscription and a **Command Code** account. You do not need both. One is enough to start.

A quick note on words. A **harness** is the program that runs the agent loop: it sends the prompts, calls the tools and reads the answers. The **model** is the brain behind it. DSH is the harness. DeepSeek V4.1 Flash is one model I use inside it.

The two routes below are independent. Add one, or add both. DSH also supports other providers, because the model plugin speaks the OpenAI-compatible wire. A free endpoint works, and so does a local model server, such as Ollama.

---

## Install DeepSeek Harness

First, take a quick look with no install:

```bash
npx @deepseek-ai/dsh web
```

The command starts a local web UI and opens it in the browser. For a permanent install:

```bash
npm install -g @deepseek-ai/dsh
```

Check the result and start it:

```bash
dsh --version
dsh web
```

The web UI listens on `127.0.0.1` and prints a link with a token. Keep that link private.

---

## How DSH finds a model

DSH is built from **plugins**. Each plugin owns one section of the settings file, and the section name is the plugin id.

The part that talks to models is the plugin `@deepseek-ai/dsh-llm-pi-ai`. Its settings section is called `llm-pi-ai`. This plugin speaks the **OpenAI-compatible** wire and the **Anthropic-compatible** wire. That is the door for both of my subscriptions.

So every provider goes under one key:

```yaml
llm-pi-ai:
  providers:
    <provider-id>:
      ...
```

The default model lives in its own section, `agent-default-model`. I set it once and the agent uses it.

---

## Set the keys

The settings file never holds a secret. It only names the environment variables that hold the keys. Set the key of each provider that you use:

```bash
export OPENCODE_API_KEY="your-open-code-go-key"
export COMMANDCODE_API_KEY="your-command-code-key"
```

If you add one provider, define one variable. Open a new terminal after this step. A running process does not see a new environment variable.

---

## Step 1: add OpenCode Go

OpenCode Go is an OpenAI-compatible gateway at `https://opencode.ai/zen/go/v1`. It accepts the model `deepseek-v4.1-flash`.

The gateway has one special rule. It wants a session header, `x-opencode-session`. Without the header it answers HTTP 400 with `MissingSessionID`. I send one stable value per tool, and the gateway is happy. The route reads its key from `OPENCODE_API_KEY`.

---

## Step 2: add Command Code

Command Code has its own OpenAI-compatible endpoint: `https://api.commandcode.ai/provider/v1`. The model id is `deepseek/deepseek-v4.1-flash`. Note the `deepseek/` prefix. OpenCode Go does not use it, and this is the one difference between the two model ids.

I tested it before I trusted it. A plain completion answered HTTP 200, and a tool-calling continuation answered HTTP 200 too. That last test matters, because a coding agent sends tool calls all the time. The route reads its key from `COMMANDCODE_API_KEY`.

---

## The final settings

Here is the whole `~/.dsh/settings.yaml`. Two routes, two keys, no secret in the file. The file only names the environment variables that hold the keys.

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

Start `dsh web` again. The model menu now shows two groups: **OpenCode Go** and **Command Code**. I pick the model per session. The `agent-default-model` block decides the model for a new session.

To make Command Code the default, change two lines:

```yaml
agent-default-model:
  provider: command-code
  model: deepseek/deepseek-v4.1-flash
```

---

## Why the context window differs

The two settings show 1,048,576 for OpenCode Go and 1,000,000 for Command Code. The reason is simple: each provider reports its own number, and I copied each one.

- Command Code publishes the value. Its `/provider/v1/models` endpoint returns `context_length: 1000000`.
- OpenCode Go does not publish it on that endpoint, so I used 1,048,576. That is the binary 1M (2 to the power of 20), the value DeepSeek uses.

The number is metadata. DSH uses it to decide when to compact the history and to show the limit. The real limit lives on the server. If I set the number too high, the gateway can refuse a long request. If I set it too low, DSH compacts early. The two values differ by less than five percent.

---

## Before DSH

Before DSH I used two native desktop apps: [OpenCode Desktop](https://opencode.ai/download) and [Command Code Desktop](https://github.com/CommandCodeAI/desktop). Both are good apps. They talk to the same subscriptions and they keep the same keys as my setup here.

But at that time neither app showed tokens per second. I could not see how fast a model answered. When a model felt slow, I blamed the network, and I waited. I had no number.

DSH adds that one number. The number changed how I work. A slow model is now a fact, not a feeling. I look at the speed, and I decide: keep it or switch.

---

## Why I stay on DeepSeek Harness

Three reasons, in order:

1. **Tokens per second in the web UI.** I do not install a plugin or write a script. The number is there. When a new model is slow, I see it in the first minute, and I switch.
2. **A harness, not a model.** I keep my OpenCode Go and Command Code subscriptions. I add a route, I add a key, and I move on. No lock-in.
3. **Local and plugin-based.** The server runs on `127.0.0.1`. The settings are one YAML file that I own. A new provider is a small block, not a fork.

The harness is free. The tokens come from my own plans. That is a good split.

---

## Wrap up

The full flow is short:

1. Install DSH with `npm install -g @deepseek-ai/dsh`.
2. Move each subscription key into an environment variable.
3. Add one `llm-pi-ai` route per provider.
4. Pick the model in the web UI.

- DeepSeek Harness: [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).
- OpenCode Go: [opencode.ai/docs/go](https://opencode.ai/docs/go/).
- Command Code: [commandcode.ai](https://commandcode.ai).

Keep your keys out of config files. Use environment variables, and rotate a key if it ever lands in a chat or a log.
