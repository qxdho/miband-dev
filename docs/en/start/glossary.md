---
title: Glossary
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://github.com/open-vela/docs"
contributors: [miband-dev]
---

# Glossary

<StatusBadge status="sourced" verified="2026-10-24" />

## System and runtime

| Term | Definition |
| --- | --- |
| **VelaOS** | Xiaomi's wearable and IoT operating system built on NuttX. In use on the band product line since the Mi Band 8 Pro (2023-08). |
| **NuttX** | Real-time operating system under the Apache Software Foundation; the kernel VelaOS is built on. |
| **Quick App (快应用)** | The JavaScript application format used by Xiaomi and other phone vendors. Written in Vue-like syntax, packaged as `.rpk`, executed by an app engine on VelaOS. |
| **AiotJS** | The JavaScript runtime that executes Quick Apps on the band. Derived from quickjs; no full browser environment. |
| **rpk** | The Quick App package format, roughly the equivalent of Android's apk or iOS's ipa. |
| **AIoT IDE** | Xiaomi's official Quick App development tool, including an emulator. |

## Native applications

| Term | Definition |
| --- | --- |
| **ET_REL** | An ELF type: a relocatable object file. NuttX `insmod` loads this type, analogous to a kernel module. |
| **insmod** | The command that loads a `.elf` module into the kernel. On the band, the entry point is `os.execute()` from a Lua watchface. |
| **miwear_app_t / miwear_page_t** | Registration structs for band applications and pages, defining app metadata and page lifecycle. |
| **packagemanager_api_s** | The app management interface: `install`, `recover`, `uninstall`, `unregister`, `set_hidden`, `is_hidden`. |
| **LVGL** | Lightweight embedded GUI library; the drawing layer for the band UI. Version 9 on the Mi Band 10 Pro. |

## Hardware

| Term | Definition |
| --- | --- |
| **BES2700iMP** | A wearable SoC from Bestechnic with a Cortex-M33 core, used in the Mi Band 10 Pro. |
| **Cortex-M33** | Arm's embedded CPU core with TrustZone support. |
| **SPI NAND** | External NAND flash attached over SPI. Stores resources and data on the band and is the main target of firmware research. |
| **PSRAM** | Pseudo-static RAM, commonly used as external expansion memory for MCUs. |
| **QEMU** | Open-source emulator. The community has attempts at emulating the band on a PC; little documentation exists. |

## Watchface and protocol

| Term | Definition |
| --- | --- |
| **Watchface bin** | The package format for band watchfaces. Can be unpacked and repacked; community tools include `Mi8WfBinTool`. |
| **auth key** | The key used for BLE pairing authentication; the first step in protocol research. |
| **bandbbs (米坛)** | The Chinese Mi Band community forum. |

## Commonly confused

- **VelaOS vs Quick App framework**: the former is the operating system, the latter an application format running on top of it.
- **Having Vela vs having a Quick App engine**: the Redmi Band 3 runs Vela but has no Quick App engine.
- **Runs in the emulator vs runs on a device**: resolution, permissions and system version can all differ.
