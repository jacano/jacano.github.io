---
title: 'C# native interop: 10 years of lessons with Box2DCS and Crunch'
date: '2025-08-02'
tag: 'C# / C++'
excerpt: 'Learn to build C++ and C# bindings. The methods are P/Invoke, C++/CLI, marshalling and performance tuning. This article shows patterns from ManagedCrunch and Box2DCS.'
read: '2 min'
---

For ten years I shipped C# code that called C and C++. Three of those bindings are open: Box2DCS (Box2D), ManagedCrunch (crnlib) and ManagedXZLZMA. Each one taught me the same lesson. A binding is easy to start and hard to keep clean.

These are the choices that kept mine alive.

---

## Pick the method first

The three options are not equal. The library picks for you.

- **P/Invoke** over a flat C API is simple and portable. If you control the library, this is the easy path. Keep the boundary in `extern "C"` and keep classes out of it.
- **C++/CLI** wraps complex C++ fast, but it locks you to Windows.
- **DNNE and NativeAOT** are the modern path on .NET 7 and later.

Choose before you write the wrapper. Changing later costs more than a rewrite.

---

## Copy less, measure more

A binding gets slow in one place: the buffer copies. Move big data with `Span<T>`, `Memory<T>` and `fixed` pointers. Copy once, not twice.

Then measure. BenchmarkDotNet tells the truth, and your instinct does not.

---

## Say who frees the memory

The bugs I remember came from lifetime mistakes, not from missing methods.

Decide who owns each buffer, and write it down. I let the native side allocate, and C# disposes with `IDisposable` and `SafeHandle`. A clear rule stops the crashes.

---

## Ship for the runtimes you support

Wrap the native library per RID: win-x64, linux-x64, osx-arm64. Test the packages in CI, not on your machine.

One tool that saved me: PdbRewriter, to read a PDB when an obfuscated build broke the stack trace.

The code is at [github.com/jacano](https://github.com/jacano).
