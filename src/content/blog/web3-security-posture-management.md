---
title: 'From audits to continuous posture: why Web3 needs W3SPM'
date: '2026-07-15'
tag: 'Web3 Security'
excerpt: 'Why a smart-contract audit is not enough when signers, permissions and oracles keep moving, and what continuous posture management adds.'
---

In 2026, most of the losses in Web3 came from the systems around the smart contracts rather than from the contracts themselves. The State of Digital Asset Security for H1 2026 attributes more than 75% of losses to operational and configuration gaps, and puts the average time from exploit to irreversible loss at 12 minutes.

Twelve minutes is not enough to read an alert, investigate it and react. If a loss completes that fast, checking production is already too late: the check has to run before the transaction is signed, in the pipeline and in the policy the signers follow.

![An audit marks one moment near the code, and after it the live system keeps moving its signers, timelocks, oracles and permissions. Posture management follows the live state instead: it discovers the assets from the code to the chain, watches production and plugs into CI/CD.](/blog/w3spm-audit-vs-camera.svg)

## An audit is a photo. You need a camera.

An audit, a formal verification or a key-management review tells you something about the system at the moment of the check.

After that, the system keeps moving. Signers change, timelocks move, oracles rotate, permissions drift. The audit can still be correct and no longer describe the live system. The question that follows is a simple one: who watches the live state?

## What continuous posture management adds

Web3 Security Posture Management (W3SPM) is that watch. It keeps a current picture of the assets and the policy, instead of a picture from last quarter, and it turns the policy into guardrails:

- it discovers the assets, from the code to the chain;
- it watches the live state rather than a snapshot;
- it plugs into CI/CD, so a policy change lands with the code.

## Why this matters to institutions

A bank moving into Web3 inherits a problem its current tooling does not cover: the state that matters lives on a chain it does not control, and it changes without a change request.

I work on this at Dedge Security, which sells a Web3-native ASPM platform, so read the argument with that in mind.
