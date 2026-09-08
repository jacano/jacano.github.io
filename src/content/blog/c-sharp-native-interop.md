---
title: 'C# native interop: 10 years of lessons with Box2DCS and Crunch'
date: '2025-08-02'
tag: 'C# / C++'
excerpt: 'Learn to build C++ and C# bindings. The methods are P/Invoke, C++/CLI, marshalling and performance tuning. This article shows patterns from ManagedCrunch and Box2DCS.'
read: '10 min'
---

I maintained C++ and C# bindings in production for more than ten years. The bindings are Box2DCS (Box2D), ManagedCrunch (crnlib) and ManagedXZLZMA. This article shows patterns that reduced pain.

## 1. Select the right method

- P/Invoke with a flat C API is simple and portable. It is ideal if you control the library. Expose extern C and avoid classes.
- C++/CLI is powerful but Windows-only. It helps with quick wrappers for complex C++.
- DNNE and NativeAOT are modern for .NET 7 and later.

## 2. Marshall data with care

Do not copy large buffers. Use `Span<T>`, `Memory<T>` and pointers with `fixed` when you need them. Measure with BenchmarkDotNet. Do not guess.

## 3. Manage lifetime

Define who frees the memory. Define ownership clearly. I prefer the native side to allocate. C# then disposes with `IDisposable` and `SafeHandle`.

## 4. Package for all runtimes

Provide runtimes per RID (win-x64, linux-x64, osx-arm64). Test in real CI. PdbRewriter helped me understand PDBs when obfuscation broke stacks.

Code is at [github.com/jacano](https://github.com/jacano). For a deep dive, contact me.
