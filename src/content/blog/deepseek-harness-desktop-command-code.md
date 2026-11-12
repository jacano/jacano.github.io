---
title: 'Install DeepSeek Harness desktop with Command Code'
date: '2026-11-10'
tag: 'AI Tooling'
excerpt: 'A step-by-step install of the DeepSeek Harness desktop app with one Command Code key: where the key goes, what the one configuration file holds, and the traps I hit on the way.'
---

I tried **DeepSeek Harness** (DSH) a few ways: the official DeepSeek API, OpenCode Go, and the desktop app on Command Code. This post is the one I kept, written as the install I wish I had read first.

![The desktop app reads two files in its home folder: cordis.patch.yml holds the four provider routes, their models and the default model, and it is watched while the app runs, and .credentials.yaml holds the keys and is read on every request. The two Command Code routes reach api.commandcode.ai.](/blog/dsh-desktop-command-code.svg)

The short version: install the desktop app, paste one Command Code key, and drop one file in `~/.dsh`.

## Why this combination

- **One key per provider.** They live in `~/.dsh/.credentials.yaml`, and DSH resolves them on every request.
- **The models I want.** Command Code serves its two models in the menu from one key.
- **The measurement.** DSH shows tokens per second in the UI, so a slow session is a number and not a feeling.

## What you need

- A Command Code account and its API key: [commandcode.ai](https://commandcode.ai). I run the **GOAT** plan.
- Windows x64, macOS Apple Silicon, or macOS Intel.

The file also carries two spare routes, OpenDesign and OpenGateway. Each one reads its own key from the same store, so leave a route out of the file when you have no key for it.

## 1. Install the desktop app

| Platform | Build |
| --- | --- |
| Windows x64 | [deepseek-harness-0.2.0-rc.2-win-x64.exe](https://download.deepseek.com/dsh-desk/bin/win-x64/deepseek-harness-0.2.0-rc.2-win-x64.exe) |
| macOS Apple Silicon | [deepseek-harness-0.2.0-rc.2-mac-arm64.zip](https://download.deepseek.com/dsh-desk/bin/mac-arm64/deepseek-harness-0.2.0-rc.2-mac-arm64.zip) |
| macOS Intel | [deepseek-harness-0.2.0-rc.2-mac-x64.zip](https://download.deepseek.com/dsh-desk/bin/mac-x64/deepseek-harness-0.2.0-rc.2-mac-x64.zip) |

This is a release candidate. The app checks its own update feed, so later builds arrive on their own, and the configuration format can change between them.

## 2. Put the key in the credentials store

Open **Settings → Models → Command Code** and paste the key. DSH writes it to `~/.dsh/.credentials.yaml`:

```yaml
version: 1
refs:
  COMMANDCODE_API_KEY: "your-command-code-key"
```

Two details decide whether this works:

- The store is read **on every request**, so the key works at once. There is nothing to restart.
- On macOS and Linux, run `chmod 600 ~/.dsh/.credentials.yaml`. DSH refuses a credentials document that other users can read. Treat the file as a secret and rotate the key in Command Code if it ever leaks.

## 3. Write the configuration file

Every profile of DSH reads `~/.dsh/cordis.patch.yml`, and that home layer outranks a profile's own layer, so the same file configures all of them.

The whole file is in [github.com/jacano/dsh-config](https://github.com/jacano/dsh-config), and it carries no comments: it is configuration, and the README explains each row. The parts that matter for this install:

```yaml
- { id: agent-default-model, name: "@deepseek-ai/dsh-agent-default-model", config: { provider: command-code, model: deepseek/deepseek-v4.1-flash-fast } }
- id: llm-pi-ai
  name: "@deepseek-ai/dsh-llm-pi-ai"
  config:
    providers:
      command-code:
        displayName: Command Code
        api: openai-completions
        baseURL: https://api.commandcode.ai/provider/v1
        apiKeyEnv: COMMANDCODE_API_KEY
        models:
          - { id: deepseek/deepseek-v4.1-flash-fast, name: DeepSeek V4.1 Flash Fast, contextWindow: 1000000, maxTokens: 32768 }
      command-code-anthropic:
        displayName: Command Code (Claude)
        api: anthropic-messages
        baseURL: https://api.commandcode.ai/provider
        apiKeyEnv: COMMANDCODE_API_KEY
        models:
          - { id: claude-haiku-5-5, name: Claude Haiku 5.5, contextWindow: 1000000, maxTokens: 32768 }
      opendesign:
        displayName: OpenDesign
        api: openai-completions
        baseURL: https://amr-link.open-design.ai/v1
        apiKeyEnv: OPENDESIGN_API_KEY
        models:
          - { id: deepseek-v4.1-flash, name: DeepSeek V4.1 Flash, contextWindow: 1000000, maxTokens: 32768 }
      opengateway:
        displayName: OpenGateway
        api: openai-completions
        baseURL: https://apis.opengateway.ai/v1
        apiKeyEnv: OPENGATEWAY_API_KEY
        models:
          - { id: deepseek/deepseek-v4.1-flash-eco, name: DeepSeek V4.1 Flash Eco, contextWindow: 1000000, maxTokens: 32768 }
```

The excerpt is abridged. The two Command Code rows also declare their `reasoningEfforts` ladder, the Claude route adds `compat: { forceAdaptiveThinking: true }`, and the OpenAI-compatible routes declare `defaultInput: [text, image]`. Copy the file, not the excerpt. It is **watched**, not read once. Save a valid edit and the running app recomposes in place, so a new model or a new route appears without a restart. An edit that cannot apply is rejected and the last good composition keeps running, so a typo cannot leave you without a menu.

## 4. Choose a model

The menu shows four groups, one per provider:

| Model | Group | Id on the wire | Context |
| --- | --- | --- | ---: |
| DeepSeek V4.1 Flash Fast | Command Code | `deepseek/deepseek-v4.1-flash-fast` | 1,000,000 |
| Claude Haiku 5.5 | Command Code (Claude) | `claude-haiku-5-5` | 1,000,000 |
| DeepSeek V4.1 Flash | OpenDesign | `deepseek-v4.1-flash` | 1,000,000 |
| DeepSeek V4.1 Flash Eco | OpenGateway | `deepseek/deepseek-v4.1-flash-eco` | 1,000,000 |

`agent-default-model` picks the one a new session starts with. I use `deepseek/deepseek-v4.1-flash-fast`. With no effort set, DSH sends no effort field and the model answers at its own default.

The first two rows cleared the repository's benchmark: capability and price first, then speed, latency and cache, then how the provider serves each model. The last two did not. They are cheaper, and they read a long context far more slowly: 35.6 and 49.2 milliseconds per 1,000 tokens against 8.4, which at 60k of context is seconds of waiting before the first token. They stay in the menu as a spare route, and the numbers behind that call are in [bench](https://github.com/jacano/dsh-config/tree/main/bench).

As of November 2026, no Claude model speaks Chat Completions on this provider: every `claude-*` id in the provider catalog advertises only `/messages`. That is why Haiku rides a second route, with `api: anthropic-messages` and the API root as the base URL. The route also sets `compat: { forceAdaptiveThinking: true }`, because Claude 5.5 rejects `thinking.type.enabled` and wants adaptive thinking plus an effort level.

Each Command Code model offers an **Effort** submenu with five levels: `low`, `medium`, `high`, `xhigh` and `max`. Command Code answers HTTP 400 to `minimal` and `none`, and every model thinks by default, so the file declares no `off` level. The submenu comes from the `reasoningEfforts` block of each entry, which is also why the Settings → Models form leaves that field alone: it is a per-model capability. The two spare routes declare no ladder, because their numbers are already too slow to run a session on.

Every model reads images. An OpenAI-compatible route declares `defaultInput: [text, image]` once, and a text-only model added later must opt out with `input: [text]`.

## What I turned off

The official DeepSeek provider is off in that file, route by route: the API-key chat route, the account chat route, the search provider, and the request-field registry. No DeepSeek route appears in the menu, no card appears in Settings → Models, and no `DEEPSEEK_API_KEY` is stored. I keep the key in one place, in one provider, and it is not DeepSeek's.

One consequence is worth knowing: `web_search` stays in the tool list of a session, because an agent preset composes the web tools and a preset takes no patch. The tool points at `searchProvider: deepseek-official`, and that provider is off, so every call fails with `configured web provider "deepseek-official" is not registered`. I do not use it, so I left it that way.

## Three traps

- **A `name` that does not match the plugin on its row is skipped, and only a warning says so.** Bundles rename ids between releases, so a row whose plugin moved works by `id` alone: leave `name` out of that one.
- **A patch replaces a whole `config`.** It is not a merge. If the row needs three keys, declare three; the one you leave out disappears.
- **The file wins over Settings.** Settings forms write below the home layer, so anything pinned here shadows them. That is why this file sets no theme and no work-details mode.

## Wrap up

One installer, one YAML file, and one key for the route you keep.

- DeepSeek Harness: [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- My configuration, not an official DeepSeek one: [github.com/jacano/dsh-config](https://github.com/jacano/dsh-config)
- Command Code, the **GOAT** plan: [commandcode.ai/docs/plans/goat](https://commandcode.ai/docs/plans/goat)
