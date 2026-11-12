---
title: 'Install DeepSeek Harness desktop with Command Code'
date: '2026-11-10'
tag: 'AI Tooling'
excerpt: 'A step-by-step install of the DeepSeek Harness desktop app with one Command Code key: where the key goes, the one file you copy, and the traps I hit on the way.'
---

I tried **DeepSeek Harness** (DSH) a few ways: the official DeepSeek API, OpenCode Go, and the desktop app on Command Code. This post is the one I kept, written as the install I wish I had read first.

![The desktop app reads two files in its home folder: cordis.patch.yml holds the four provider routes, their models and the default model, and it is watched while the app runs, and .credentials.yaml holds the keys and is read on every request. The two Command Code routes reach api.commandcode.ai.](/blog/dsh-desktop-command-code.svg)

The short version: install the app, paste one Command Code key, and copy one file into `~/.dsh`.

## Why this combination

- **One key.** It lives in `~/.dsh/.credentials.yaml`, and DSH resolves it on every request.
- **The models I want.** Command Code serves two models in the menu from that one key.
- **The measurement.** DSH shows tokens per second in the UI, so a slow session is a number and not a feeling.

## What you need

- A Command Code account and its API key: [commandcode.ai](https://commandcode.ai). I run the **GOAT** plan.
- Windows x64, macOS Apple Silicon, or macOS Intel.

The file I link below also carries two spare routes, OpenDesign and OpenGateway. Each one reads its own key from the same store, so leave a route out when you have no key for it.

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

## 3. Copy the configuration file

Every profile of DSH reads `~/.dsh/cordis.patch.yml`, and that home layer outranks a profile's own layer, so one file covers all of them.

I keep mine in [github.com/jacano/dsh-config](https://github.com/jacano/dsh-config). Download it and copy it to `~/.dsh/`:

```powershell
Copy-Item "cordis.patch.yml" "$HOME\.dsh\" -Force
```

```bash
cp cordis.patch.yml ~/.dsh/
```

The file is **watched**, not read once. Save a valid edit and the running app picks it up in place, so a new model or a new route appears without a restart. An edit that cannot apply is rejected and the last good version keeps running, so a typo cannot leave you without a menu.

The file carries no comments on purpose: it is configuration, and the README of that repository explains each row.

## 4. Choose a model

The menu shows the models of each provider as its own group. Command Code has two rows: **DeepSeek V4.1 Flash Fast** and **Claude Haiku 5.5**. The other two groups, OpenDesign and OpenGateway, are the spare routes.

A new session starts with the model named by `agent-default-model` in the file. I use `deepseek/deepseek-v4.1-flash-fast`.

Each model offers an **Effort** submenu with five levels: `low`, `medium`, `high`, `xhigh` and `max`. The submenu comes from each entry's `reasoningEfforts` block, which is also why the Settings → Models form leaves that field alone: it is a per-model capability.

## What I turned off

The official DeepSeek provider is off in that file, route by route: the API-key chat route, the account chat route, the search provider, and the request-field registry. No DeepSeek route appears in the menu, no card appears in Settings → Models, and no `DEEPSEEK_API_KEY` is stored. I keep one key per provider, and none of them is DeepSeek's.

One consequence is worth knowing: `web_search` stays in the tool list of a session, because an agent preset composes the web tools and a preset takes no patch. The tool points at the DeepSeek search provider, which is off, so every call fails with `configured web provider "deepseek-official" is not registered`. I do not use it, so I left it that way.

## Three traps

- **A `name` that does not match the plugin on its row is skipped, and only a warning says so.** Bundles rename ids between releases, so a row whose plugin moved works by `id` alone: leave `name` out of that one.
- **A patch replaces a whole `config`.** It is not a merge. If the row needs three keys, declare three; the one you leave out disappears.
- **The file wins over Settings.** Settings forms write below the home layer, so anything pinned here shadows them. That is why this file sets no theme and no work-details mode.

## Wrap up

One installer, one YAML file, and one key for the route you keep.

- DeepSeek Harness: [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- My configuration, not an official DeepSeek one: [github.com/jacano/dsh-config](https://github.com/jacano/dsh-config)
- Command Code, the **GOAT** plan: [commandcode.ai/docs/plans/goat](https://commandcode.ai/docs/plans/goat)
