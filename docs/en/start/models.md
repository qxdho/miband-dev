---
title: Device capability matrix
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/"
contributors: [miband-dev]
---

# Device capability matrix

<StatusBadge status="sourced" verified="2026-10-24" />

This site performs no hands-on testing. Every entry comes from public documentation or community reports. `✓` means a source claims the capability works; it does not mean the author reproduced it on a device. Entries that cannot be confirmed are filled with `unknown`.

## Matrix

<ModelMatrix />

The data source is `docs/.vitepress/data/models.json`. Editing that file updates the matrix on both the home page and this page.

## Field definitions

| Field | Meaning | Notes |
| --- | --- | --- |
| `screen` | Screen resolution, width × height in px | Affects Quick App layout |
| `radius` | Screen corner radius in px; `999` means pill or circle | Affects safe area and layout |
| `os` | Operating system | All China-region bands currently run VelaOS |
| `soc` | Main SoC | Unconfirmed models use `unknown` |
| `quickapp` | Whether Quick Apps can be installed and run | Depends on the presence of an app engine |
| `watchface` | Whether custom watchfaces can be installed | Tied to the watchface bin format |
| `native` | Whether custom ELF modules can be loaded via NuttX `insmod` | Least documented |
| `flash` | Whether firmware can be backed up and flashed | High risk, see [Firmware](/firmware/) |

Capability fields take one of `true`, `false`, `"partial"`, `"unknown"`.

## Known facts and sources

| Fact | Confidence | Source |
| --- | --- | --- |
| VelaOS has shipped since the Mi Band 8 Pro (2023-08); later adopted by Band 9, 9 Pro, Redmi Watch 4/5 and Band 10 | High | Luming's notes |
| Redmi Band 3 runs Vela but has no Quick App engine, so Quick Apps cannot be installed | High | Luming's notes |
| Resolutions: Band 8 Pro 480×336; Band 9 192×490; Band 9 Pro 480×336; Band 10 212×520; Redmi Watch 4 390×450; Redmi Watch 5 432×514 | Medium, single blog post, needs review | Luming's notes |
| Corner radii: Band 9 999px; Band 9 Pro 48px; Band 10 999px; Redmi Watch 5 90px | Medium | Luming's notes |
| Mi Band 10 Pro hardware: BES2700iMP Cortex-M33, 16Mb on-chip SPI flash, ~2.5MB SRAM, 16Mb PSRAM, external SPI NAND 512/256Mb | Medium-high | Habr |
| Mi Band 10 Pro software: NuttX + LVGL v9; watchfaces driven by Lua scripts, apps executed by AiotJS (a quickjs derivative) | Medium-high | Habr |
| Native path: obtain a shell from a Lua watchface via `os.execute()`, then load an ET_REL module with `insmod /data/xxx.elf` | Medium-high | Habr |
| App registration interfaces: `miwear_app_t`, `miwear_page_t` and `packagemanager_api_s` (install / recover / uninstall / unregister / set_hidden / is_hidden) | Medium-high | Habr |

## China-region vs international

This site covers China-region devices only. International firmware differs in app store availability and some system capabilities, and is not covered here.

## How to update

Edit the corresponding field in `docs/.vitepress/data/models.json`, attach evidence in the pull request description (screenshot, log or source link), and update the "Known facts and sources" table above. Fields that cannot be confirmed stay `unknown`.
