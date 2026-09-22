# Frosty Foods — B2B Website Redesign

A formal, export-first bilingual (EN/AR) redesign concept for [frosty-foods.com](https://www.frosty-foods.com/). Frosty Foods is a certified Egyptian manufacturer and exporter of IQF (Individually Quick Frozen) fruits and vegetables, based in Alexandria with a production facility in New Borg El Arab.

**[→ View live site](https://mohamed-sr-designer.github.io/frosty-foods-redesign/)**

---

## Direction

Version 2 moves the site from a consumer-led story to a **global B2B trade presence**: formal, data-sheet clarity for importers, distributors, retail chains and food service. The motion is deliberately restrained — line reveals, counters, card flips, a process progress line, and animated shipping routes.

- **Palette:** from the logo. Deep navy `#061A2E` → brand navy `#0C3352`, ice `#39B9E4`, with fresh green `#3FBE23` used only as a signal colour.
- **Type:** Manrope (display), Inter (text), IBM Plex Mono (spec labels), IBM Plex Sans Arabic (Arabic).

## Sections

| # | Section | Purpose |
|---|---|---|
| — | Hero | The original Frosty video, kept as-is, plus key figures and a live "in season now" line driven by the current month |
| — | Trust strip | Six certifications and an exhibitions marquee (Gulfood, SIAL, Anuga, World Food) |
| 01 | Company | Mission, values, facility photography and company facts |
| 02 | Production | IQF vs. block freezing, and a six-step process from farm to reefer, over the production-line photo |
| 03 | Product range | The **14 new retail packs**. Each pack has a separate front and back image, with a flip per card and a global Front/Back switch. Each card opens a spec sheet (cuts and grades, formats, harvest window, storage, HS heading). Includes the new French Fries SKU |
| 04 | Seasonality | Interactive harvest planner: pick a month to see crops in harvest and what opens next |
| 05 | Solutions | Retail, private label, food service & bulk, industrial drums |
| 06 | Packing & shipping | Carton formats, drum specs, container loads, incoterms |
| 07 | Markets | Contained panel with a dotted world map and region filter highlighting export routes |
| 08 | Quality | Six-certification rail, four-step quality flow and the IQF promise |
| 09 | RFQ | Order flow and a structured quotation form. Products added to "Quote" from any card are pre-selected |
| 10 | FAQ | Master–detail buyer FAQ (accordion on mobile), plus a small consumer path |

## Assets

- `assets/img/packs/*-front.webp` / `*-back.webp` — the 14 SKU pack renders, each split from the combined front+back artwork
- `assets/img/factory/` — facility aerial and production-line photography
- `assets/hero-video.mp4` — the original hero video

All product names, specifications, seasons, packing and container data, certifications and contact details come from the client's existing site.

## Run locally

```bash
npx serve . -l 4360
```

---

*Redesign concept by [Mohamed Tarek](https://github.com/Mohamed-sr-Designer). Brand assets, product packaging and company information belong to Frosty Foods.*
