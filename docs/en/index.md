---
layout: home

hero:
  name: Mi Band Developer Docs
  text: Developer resources for Xiaomi Mi Band / Smart Band
  tagline: "Every bit of Vela's potential: watchfaces, Quick Apps, native apps and platform material. China-region devices only. Every page records its sources and review date."
  image:
    src: /logo.svg
    alt: Mi Band Developer Docs
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
Only the Start section is available in English. The other sections are currently Chinese-only: [Watchfaces](/watchface/), [Quick Apps](/quickapp/), [Native apps](/native/), [Platform & tools](/platform/).

Translated pages are welcome as contributions; see `CONTRIBUTING.md` in the repository root.
:::

## Device capability matrix

<ModelMatrix />

Field definitions and sources are listed on the [device matrix](/en/start/models) page. This site performs no hands-on testing, so every entry is marked `sourced` or `unverified`.

## Sections

| Section | Content | Entry |
| --- | --- | --- |
| Start | Three routes, device support, terminology | [Overview](/en/start/) · [Device matrix](/en/start/models) · [Glossary](/en/start/glossary) |
| Watchfaces | Regular and Lua watchfaces, container format, installation | [Overview](/watchface/) (Chinese) |
| Quick Apps | JavaScript applications packaged as `.rpk` | [Overview](/quickapp/) (Chinese) |
| Native apps | Concept, supported devices, loading, capabilities | [Overview](/native/) (Chinese) |
| Platform & tools | Firmware, BLE, tools, references and examples | [Overview](/platform/) (Chinese) |

## Disclaimer

This site is a community compilation of documentation. It is an unofficial project and is not affiliated with Xiaomi. It does not host official firmware or resource bundles and does not provide one-click flashing tools. Documentation is licensed under CC BY-SA 4.0, code under MIT.
