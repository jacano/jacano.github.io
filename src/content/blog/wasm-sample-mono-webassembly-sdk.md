---
title: 'WasmSample: .NET on WebAssembly with Mono.WebAssembly.Sdk'
date: '2019-05-04'
tag: 'Archive · WASM'
excerpt: 'A small 2019 sample showing .NET running in a browser through WebAssembly and Mono.WebAssembly.Sdk.'
---

In 2019 I published [WasmSample](https://github.com/jacano/WasmSample), a small demonstration of .NET running in a browser as WebAssembly. No plugin required. The original post is at [x.com/jacano35/status/1124476690640572416](https://x.com/jacano35/status/1124476690640572416).

## Why WASM

WebAssembly runs compiled code in the page, which let me keep the browser-side logic in C# instead of rewriting it in JavaScript.

The project also closed a circle. In 2017 I added WASM support for five IL opcodes (`neg`, `not`, `switch`, `throw` and `nop`) to [dotnet/corert](https://github.com/dotnet/corert). This sample runs on a different toolchain, Mono, but the idea is the same: .NET compiled to the browser.

## What is inside

- A **Shell** project: the HTML page and the JavaScript that loads the runtime.
- A **WASM** project: the C# code, built with Mono.WebAssembly.Sdk.
- A `build.sh` script and a `scripts` folder: the build.

## Run it

The sample targets the 2019 Mono toolchain, so a current SDK may refuse to build it. Serve the output over HTTP instead of opening the file, because browsers do not load WebAssembly from `file://`. The [README](https://github.com/jacano/WasmSample) has the steps as they were at the time.

*First shared May 4, 2019 at x.com/jacano35. Republished 2026 on jacano.github.io.*