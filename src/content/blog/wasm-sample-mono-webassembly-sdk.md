---
title: 'WasmSample: .NET on WebAssembly with Mono.WebAssembly.Sdk'
date: '2019-05-04'
tag: 'Archive · WASM'
excerpt: 'Sample WASM project with Mono.WebAssembly.Sdk. It shows .NET on WebAssembly and links to my WASM work in dotnet/corert (CLR).'
read: '4 min'
---

On May 4, 2019 I published [WasmSample](https://github.com/jacano/WasmSample), a sample WASM project with Mono.WebAssembly.Sdk. The post on X is at [x.com/jacano35/status/1124476690640572416](https://x.com/jacano35/status/1124476690640572416).

The sample shows how to run .NET code as WebAssembly in the browser. It uses Mono.WebAssembly.Sdk to compile C# to WASM and to run it without a plugin.

## Why WASM

WASM runs in the browser at near-native speed. It allows you to use C# where you normally use JavaScript. For me it linked to the WASM work I did in [dotnet/corert](https://github.com/dotnet/corert) (CLR). In CoreRT I added WASM support for IL opcodes (neg, not, switch, throw, nop) in 2017.

## What the sample holds

- It has a Shell project and a WASM project.
- It builds with `build.sh` and `scripts`.
- It runs the Mono runtime in the browser as WASM.

## Use it

Clone the repo. Then run the build script. Then open the result in the browser. The README at [github.com/jacano/WasmSample](https://github.com/jacano/WasmSample) shows the steps.

Code is at [github.com/jacano/WasmSample](https://github.com/jacano/WasmSample). It is open for PRs.

---

*First shared May 4, 2019 at x.com/jacano35. Republished 2026 on jacano.dev. Tags: WASM, Mono, .NET*
