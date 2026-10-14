---
title: 'Install DeepSeek Harness desktop with Command Code'
date: '2026-10-15'
tag: 'AI Tooling'
excerpt: 'A step-by-step install of the DeepSeek Harness desktop app with one Command Code key: where the key goes, what the one configuration file holds, and the traps I hit on the way.'
---

I tried **DeepSeek Harness** (DSH) a few ways: the official DeepSeek API, OpenCode Go, and the desktop app on Command Code. This post is the one I kept, written as the install I wish I had read first.

![The desktop app reads two files in its home folder: cordis.patch.yml at boot for the route, the six models and the default model, and .credentials.yaml on every request for the key. Both feed one HTTPS route to api.commandcode.ai/provider/v1.](/blog/dsh-desktop-command-code.svg)

The short version: install the desktop app, paste one Command Code key, drop one file in `~/.dsh`, and restart.

## Why this combination

- **One key.** It lives in `~/.dsh/.credentials.yaml`, and DSH resolves it on every request.
- **The models I want.** Command Code serves `deepseek/deepseek-v4.1-flash` and five more models from one key.
- **The measurement.** DSH shows tokens per second in the UI, so a slow session is a number and not a feeling.

## What you need

- A Command Code account and its API key: [commandcode.ai](https://commandcode.ai). I run the **GOAT** plan.
- Windows x64, macOS Apple Silicon, or macOS Intel.

## 1. Install the desktop app

| Platform | Build |
| --- | --- |
| Windows x64 | [deepseek-harness-0.2.0-rc.2-win-x64.exe](https://download.deepseek.com/dsh-desk/bin/win-x64/deepseek-harness-0.2.0-rc.2-win-x64.exe) |
| macOS Apple Silicon | [deepseek-harness-0.2.0-rc.2-mac-arm64.zip](https://download.deepseek.com/dsh-desk/bin/mac-arm64/deepseek-harness-0.2.0-rc.2-mac-arm64.zip) |
| macOS Intel | [deepseek-harness-0.2.0-rc.2-mac-x64.zip](https://download.deepseek.com/dsh-desk/bin/mac-x64/deepseek-harness-0.2.0-rc.2-mac-x64.zip) |

The app then checks its own update feed, so later builds arrive on their own.

## 2. Put the key in the credentials store

Open **Settings → Models → Command Code** and paste the key. DSH writes it to `~/.dsh/.credentials.yaml`:

```yaml
version: 1
refs:
  COMMANDCODE_API_KEY: "your-command-code-key"
```

Two details decide whether this works:

- The store is read **on every request**, so the key works at once. There is nothing to restart.
- On macOS and Linux, run `chmod 600 ~/.dsh/.credentials.yaml`. DSH refuses a credentials document that other users can read.

## 3. Write the configuration file

Every profile of DSH reads `~/.dsh/cordis.patch.yml`, and that home layer outranks a profile's own layer, so the same file configures all of them.

The whole file is in [github.com/jacano/dsh-config](https://github.com/jacano/dsh-config). The parts that matter for this install:

```yaml
- id: agent-default-model
  name: "@deepseek-ai/dsh-agent-default-model"
  config:
    provider: command-code
    model: deepseek/deepseek-v4.1-flash
- id: llm-pi-ai
  name: "@deepseek-ai/dsh-llm-pi-ai"
  config:
    providers:
      command-code:
        displayName: Command Code (openai-completions)
        api: openai-completions
        baseURL: https://api.commandcode.ai/provider/v1
        apiKeyEnv: COMMANDCODE_API_KEY
        defaultContextWindow: 1000000
        defaultInput: [text, image]
        models:
          - id: deepseek/deepseek-v4.1-flash
            name: DeepSeek V4.1 Flash (Command Code, openai-completions)
            contextWindow: 1000000
            maxTokens: 32768
            reasoningEfforts:
              low: low
              medium: medium
              high: high
              xhigh: xhigh
              max: max
```

Restart the app after you write the file. DSH reads the patch layer at boot and never watches it.

## 4. Choose a model

The menu shows one group, **Command Code**, with six models:

| Model | Id on the wire | Context |
| --- | --- | ---: |
| DeepSeek V4.1 Flash | `deepseek/deepseek-v4.1-flash` | 1,000,000 |
| DeepSeek V4.1 Flash Fast | `deepseek/deepseek-v4.1-flash-fast` | 1,000,000 |
| GLM-5.3 Flash | `z-ai/glm-5.3-flash` | 1,048,576 |
| GLM-5.3 FlashX | `z-ai/glm-5.3-flashx` | 1,000,000 |
| Muse Spark 1.3 Contributor | `meta/muse-spark-1.3-contributor` | 1,048,576 |
| MiMo V2.6 Flash | `xiaomi/mimo-v2.6-flash` | 1,048,576 |

`agent-default-model` picks the one a new session starts with. I use `deepseek/deepseek-v4.1-flash` and I set no effort level, so the model answers at its own default.

Each model offers an **Effort** submenu with five levels: `low`, `medium`, `high`, `xhigh` and `max`. Command Code answers HTTP 400 to `minimal` and `none`, and every model thinks by default, so the file declares no `off` level. The submenu comes from the `reasoningEfforts` block of each entry, which is also why the Settings → Models form leaves that field alone: it is a per-model capability.

All six models read images. The route declares `defaultInput: [text, image]` once, and a text-only model added later must opt out with `input: [text]`.

## What I turned off

The official DeepSeek provider is off in that file, route by route: the API-key chat route, the account chat route, the search provider, and the request-field registry. No `deepseek-official` route appears in the menu, no card appears in Settings → Models, and no `DEEPSEEK_API_KEY` is stored. I keep the key in one place, in one provider, and it is not DeepSeek's.

One consequence is worth knowing: `web_search` stays in the tool list of a session, because an agent preset composes the web tools and a preset takes no patch, but every call fails with `WEB_PROVIDER_UNAVAILABLE`. I do not use it, so I left it that way.

## Three traps

- **A patch that names a plugin which does not sit on that row is skipped, and only a warning says so.** Bundles repurpose ids between releases: on the desktop `llm-deepseek` mounts `dsh-llm-deepseek-api-key`, while the npm install mounts `dsh-llm-deepseek`. Rows whose plugin moved carry no `name` and match by `id`.
- **The Settings forms write below the home layer**, so a preference pinned in this file shadows the form. That is why the file sets no theme and no work-details mode: they belong to Settings.
- **The file is read at boot.** Edit it, then restart the app.

## Wrap up

One installer, one key, one YAML file.

- DeepSeek Harness: [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- My configuration: [github.com/jacano/dsh-config](https://github.com/jacano/dsh-config)
- Command Code, the **GOAT** plan: [commandcode.ai/docs/plans/goat](https://commandcode.ai/docs/plans/goat)
