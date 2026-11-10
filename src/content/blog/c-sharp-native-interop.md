---
title: 'C# native interop: 10 years of lessons with Box2DCS and Crunch'
date: '2025-08-02'
tag: 'C# / C++'
excerpt: 'What I learned maintaining C# bindings for C and C++: choosing between P/Invoke and C++/CLI, avoiding unnecessary copies, owning native memory, and packaging for the runtimes you support.'
---

I have spent ten years making C# call into C and C++. Three of those bindings are open source: Box2DCS, ManagedCrunch and ManagedXZLZMA. The hard part was never exposing the first function; it was keeping the boundary reliable as the code, the runtimes and the platforms changed.

These are the notes I keep coming back to.

![A typical binding copies the payload twice, once into an unmanaged staging buffer and once into the structure of the native API, so it moves twice the bytes; a binding that hands the native API a pointer into the managed buffer copies once, and copies once into the native structure when the API demands its own layout. Three cards below list the door (P/Invoke, C++/CLI or DNNE with NativeAOT), who frees the memory (the native side allocates, C# disposes) and the package per runtime (win-x64, linux-x64, osx-arm64, tested in CI).](/blog/csharp-interop-copies.svg)

## The native API picks the method

I start with the native library, not with the wrapper, because the shape of its API usually makes the choice obvious.

- **P/Invoke** over a flat C API is simple and portable, and it is the easy path when I control the library. Keep the boundary in `extern "C"` and keep classes out of it.
- **C++/CLI** wraps complex C++ quickly, and it locks the binding to Windows.
- **DNNE and NativeAOT** are the modern path on .NET 7 and later.

I choose before I write the wrapper, because changing direction once the wrapper exists is the expensive part.

## The boundary is the buffer copy

A binding usually slows down in one place: the copies. I move big data with `Span<T>`, `Memory<T>` and `fixed` pointers, and I copy once instead of twice.

Then I measure, because instinct is a poor judge of a copy.

## Decide who frees the memory

The bugs I remember came from lifetime mistakes, not from missing methods.

Deciding who owns each buffer, and writing it down, removes most of them. My rule is that the native side allocates and C# disposes, with `IDisposable` and `SafeHandle`.

## A package per runtime

I wrap the native library per RID: win-x64, linux-x64, osx-arm64. I test the packages in CI rather than on my machine.

The code is in three repositories: [Box2DCS](https://github.com/jacano/Box2DCS), [ManagedCrunch](https://github.com/jacano/ManagedCrunch) and [ManagedXZLZMA](https://github.com/jacano/ManagedXZLZMA).
