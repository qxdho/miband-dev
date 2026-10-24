---
title: Overview
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: unverified
source: "https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/"
contributors: [miband-dev]
---

# Overview

<StatusBadge status="unverified" verified="2026-10-24" />

Content is organised into six layers by purpose, not by file type or device model.

## Typical paths

| Goal | Entry | Prerequisites |
| --- | --- | --- |
| Write and install an app | [Quick App](/apps/quickapp/) | JavaScript, single-file Vue components |
| Build a watchface | [Watchface](/apps/watchface/) | Lua, resource bundling format |
| Modify the system and firmware | [Firmware](/system/firmware/) → [Native](/system/native/) | Linux fundamentals, willingness to risk a bricked device |

The two cross-cutting sections are [Protocol](/refs/) and [Tools and examples](/refs/).

## Layers

```text
Quick App   JavaScript runtime, officially supported
  ↓
Watchface   Lua scripts + resource bundle
  ↓
Firmware    partitions, dump, unpack, flash
  ↓
Native      NuttX loadable modules
```

Each step down is closer to the hardware, has less public documentation, and carries more operational risk. Problems solvable at an upper layer do not require going lower.

## Frontmatter fields

Every content page declares the following fields, which determine how far its content can be trusted.

| Field | Meaning |
| --- | --- |
| `status` | `tested` reproduced on a device; `sourced` has a public source; `unverified` mentioned but not confirmed |
| `verified` | Date the sources were last checked, not the date of testing |
| `models` | Applicable models; abbreviations are defined on the [device matrix](/en/start/models) |

This site is a documentation compilation and performs no hands-on testing, so most pages are `sourced` or `unverified`.

## Sections

| Section | Content |
| --- | --- |
| [Start](/en/start/) | Device support, terminology |
| [Quick App](/apps/quickapp/) | Writing `.rpk` packages and installing them |
| [Watchface](/apps/watchface/) | Watchface format, packaging and replacement |
| [Firmware](/system/firmware/) | Backup, partition reading, unpacking |
| [Native](/system/native/) | Running self-compiled C modules on NuttX |
| [Protocol](/refs/) | BLE communication between band and phone |
| [Tools](/refs/) | Existing tools and their scope |
| [Examples](/refs/examples) | Example projects that build as-is |

Sections other than Start are currently Chinese-only.

## Related pages

- Terminology: [Glossary](/en/start/glossary)
- Device support: [Device matrix](/en/start/models)
- Contributing: `CONTRIBUTING.md` in the repository root
