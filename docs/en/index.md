---
layout: home

hero:
  name: Mi Band Developer Handbook
  text: Developer resources for Xiaomi Mi Band / Smart Band
  tagline: Quick Apps · Watchfaces · Firmware research · Native apps. China-region devices only. Every page records its sources and review date.
  image:
    src: /logo.svg
    alt: Mi Band Developer Handbook
  actions:
    - theme: brand
      text: Device capability matrix
      link: /en/start/models
    - theme: alt
      text: Glossary
      link: /en/start/glossary

features:
  - title: Device × capability matrix
    details: Ten fields per model, covering Quick App support, custom watchfaces, native modules and firmware flashing. Unconfirmed entries are marked unknown.
  - title: Sources and review dates
    details: Frontmatter on every page records applicable models, firmware version, confidence level and the date its sources were last checked.
  - title: Index first
    details: Official documentation already covers Quick App basics. This site collects model differences, tool indexes and failure cases reported by the community.
---

::: info Translation status
Only this **Start** section has an English version. The other sections are currently Chinese-only: [Quick App](/apps/quickapp/), [Watchface](/apps/watchface/), [Firmware](/system/firmware/), [Native](/system/native/), [Protocol](/refs/).

Contributions of translated pages are welcome; see `CONTRIBUTING.md` in the repository root.
:::

## Device capability matrix

<ModelMatrix />

Field definitions and sources are listed on the [device matrix](/en/start/models) page. This site performs no hands-on testing; every entry is `sourced` or `unverified`.

## Sections

Six layers ordered by purpose. The further down, the closer to the hardware and the higher the risk.

| Section | Content | Entry |
| --- | --- | --- |
| Start | Device support, terminology | [Overview](/en/start/) · [Device matrix](/en/start/models) · [Glossary](/en/start/glossary) |
| Quick App | Applications written in JavaScript, packaged as `.rpk` | [Overview](/apps/quickapp/) (Chinese) |
| Watchface | Lua scripts and resource bundles | [Overview](/apps/watchface/) (Chinese) |
| Firmware | Backup, partition dump, unpacking, flashing | [Overview](/system/firmware/) (Chinese) |
| Native | Loading C modules on NuttX | [Overview](/system/native/) (Chinese) |
| Protocol | BLE communication between band and phone | [Overview](/refs/) (Chinese) |

Cross-cutting sections: [Tools](/refs/) and [Examples](/refs/examples), both Chinese-only for now.

## Disclaimer

This site is a community compilation of documentation. It is an unofficial project and is not affiliated with Xiaomi. It does not host official firmware or resource bundles and does not provide one-click flashing tools. Documentation is licensed under CC BY-SA 4.0, code under MIT.
