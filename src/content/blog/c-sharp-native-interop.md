---
title: 'C# native interop: 10 years of lessons with Box2DCS and Crunch'
date: '2025-08-02'
tag: 'C# / C++'
excerpt: 'Lessons from maintaining C# bindings for C and C++: choosing between P/Invoke and C++/CLI, avoiding unnecessary copies, managing native memory, and packaging for the runtimes you support.'
---

I have spent ten years making C# call into C and C++. Three of those bindings are open source: Box2DCS, ManagedCrunch, and ManagedXZLZMA. The hard part was never exposing the first function. It was keeping the boundary reliable as the code, runtimes, and platforms changed.

These are the rules I kept coming back to.

---

## Pick the method first

Start with the native library, not the wrapper. The shape of its API usually makes the choice clear.

- **P/Invoke** over a flat C API is simple and portable. If you control the library, this is the easy path. Keep the boundary in `extern "C"` and keep classes out of it.
- **C++/CLI** wraps complex C++ fast, but it locks you to Windows.
- **DNNE and NativeAOT** are the modern path on .NET 7 and later.

Choose before you write the wrapper. Changing direction later can cost more than a rewrite.

---

## Copy less, measure more

A binding usually slows down at one boundary: buffer copies. Move big data with `Span<T>`, `Memory<T>` and `fixed` pointers. Copy once, not twice.

Then measure. BenchmarkDotNet tells the truth, and your instinct does not.

---

## Say who frees the memory

The bugs I remember came from lifetime mistakes, not missing methods.

Decide who owns each buffer, and write it down. I let the native side allocate, and C# disposes with `IDisposable` and `SafeHandle`. A clear rule stops the crashes.

---

## Ship for the runtimes you support

Wrap the native library per RID: win-x64, linux-x64, osx-arm64. Test the packages in CI, not on your machine.

One tool that saved me was PdbRewriter. It let me read a PDB when an obfuscated build broke a stack trace.

The code is at [github.com/jacano](https://github.com/jacano).
