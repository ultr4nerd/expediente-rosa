---
title: Sonner
description: Confirmation toast (shadcn sonner)
read_when: When confirming something was saved or flagging a non-blocking error
status: draft
updated: 2026-11-21
---

# Sonner

## Purpose

Confirms actions ("Paciente guardada en esta laptop") without interrupting capture. Blocking errors
go inline, next to the field, not in a toast.

## Usage

Mount `<Toaster />` once at the root; call `toast.success(...)`, `toast.error(...)` from `sonner`.
Background `color.surface-raised`, shadow `shadow.overlay`.

## Code

`src/components/ui/sonner.tsx` (local change: no next-themes, fixed light theme).
