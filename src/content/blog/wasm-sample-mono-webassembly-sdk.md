---
title: 'WasmSample: .NET on WebAssembly with Mono.WebAssembly.Sdk'
date: '2019-05-04'
tag: 'Archive · WASM'
excerpt: 'Sample WASM project with Mono.WebAssembly.Sdk. It shows .NET on WebAssembly and links to my WASM work in dotnet/corert (CLR).'
read: '1 min'
---

On May 4, 2019 I published [WasmSample](https://github.com/jacano/WasmSample). It is a small project that proves one big thing: .NET can run in the browser as WebAssembly, with no plugin. The original post is at [x.com/jacano35/status/1124476690640572416](https://x.com/jacano35/status/1124476690640572416).

---

## Why WASM

WebAssembly runs in the browser at near-native speed. That means you can write C# where you normally write JavaScript.

It also closed a circle for me. In 2017 I added WASM support for IL opcodes (neg, not, switch, throw, nop) to [dotnet/corert](https://github.com/dotnet/corert). Two years later I could share a sample that used it.

---

## What is inside

The sample is small on purpose:

- A Shell project and a WASM project.
- A `build.sh` script and a `scripts` folder.
- The Mono runtime, compiled to WASM, running in the page.

---

## Run it

Clone the repo, run the build script, and open the result in the browser. The steps are in the [README](https://github.com/jacano/WasmSample).

The code is at [github.com/jacano/WasmSample](https://github.com/jacano/WasmSample), and it is open for pull requests.

---

*First shared May 4, 2019 at x.com/jacano35. Republished 2026 on jacano.dev.*
