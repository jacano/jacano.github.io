---
title: 'From audits to continuous posture: why Web3 needs W3SPM'
date: '2026-07-15'
tag: 'Web3 Security'
excerpt: 'Why a smart-contract audit is not enough when signers, permissions and oracles keep moving, and what continuous posture management adds.'
---

In 2026, most of the losses in Web3 came from the systems around the smart contracts rather than from the contracts themselves. The State of Digital Asset Security for H1 2026 attributes more than 75% of losses to operational and configuration gaps, and puts the average time from exploit to irreversible loss at 12 minutes.

Twelve minutes is not enough to read an alert, investigate it and react. The detection has to happen before the incident reaches production.

## An audit is a photo. You need a camera.

An audit, a formal verification or a key-management review tells you something about the system at the moment of the check.

After that, the system keeps moving. Signers change, timelocks move, oracles rotate, permissions drift. The audit can still be correct and no longer describe the live system. The question that follows is a simple one: who watches the live state?

## What continuous posture management adds

Web3 Security Posture Management (W3SPM) is that watch. It keeps a current picture of the assets and the policy, instead of a picture from last quarter, and it turns the policy into guardrails:

- it discovers the assets, from the code to the chain,
- it looks for risk on its own,
- it watches production, and it plugs into CI/CD.

## Why this matters to institutions

A bank moving into Web3 inherits a problem its current tooling does not cover: the state that matters lives on a chain it does not control, and it changes without a change request.

I work on this at Dedge Security, which sells a Web3-native ASPM platform. That is my interest in the subject, and it is worth saying plainly rather than leaving it for the reader to guess.
