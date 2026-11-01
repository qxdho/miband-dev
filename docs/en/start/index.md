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

Content is organised around three application forms — watchfaces, Quick Apps and native apps — plus a platform layer.

## Typical paths

| Goal | Entry | Prerequisites |
| --- | --- | --- |
| Write and install an app | [Quick App](/quickapp/) | JavaScript, single-file Vue components |
| Build a watchface | [Watchface](/watchface/) | Lua, resource bundling format |
| Load a native module | [Native apps](/native/) | Supported device, Lua watchface as installer, C toolchain |
| Modify the system and firmware | [Firmware](/platform/firmware/) | Linux fundamentals, willingness to risk a bricked device |

The platform layer covers [firmware](/platform/firmware/), [BLE](/platform/protocol/ble), [tools](/platform/tools/) and [references](/platform/reference/references).

## Three routes

```text
Watchface   Lua script + resource bundle, or a regular tool-made watchface
Quick App   JavaScript runtime, officially supported
Native app  ELF module loaded via insmod, only on supported firmware
     ↓
Platform    firmware, BLE, tools — shared by all three
```

Native apps have no standalone installer: they are shipped inside a Lua watchface, which unpacks and loads the module.

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
| [Start](/en/start/) | Three routes, device support, terminology |
| [Watchfaces](/watchface/) | Regular vs Lua watchfaces, format, installation |
| [Quick Apps](/quickapp/) | Writing `.rpk` packages and installing them |
| [Native apps](/native/) | Concept, supported devices, loading, capabilities |
| [Platform & tools](/platform/) | Firmware, BLE, tools, references, examples |

Sections other than Start are currently Chinese-only.

## Related pages

- Terminology: [Glossary](/en/start/glossary)
- Device support: [Device matrix](/en/start/models)
- Contributing: `CONTRIBUTING.md` in the repository root
