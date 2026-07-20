# Frosty Foods — Website Redesign Concept

A premium bilingual (EN/AR) redesign concept for [frosty-foods.com](https://www.frosty-foods.com/) — an Egyptian premium IQF (Individually Quick Frozen) fruits & vegetables manufacturer based in Alexandria, serving both retail consumers (B2C) and export/wholesale clients (B2B).

**[→ View live demo](https://mohamed-sr-designer.github.io/frosty-foods-redesign/)**

---

## The concept: "The Cold Room"

The page opens bright — frost white and ice cyan — for the consumer journey. As you scroll toward the business section, the page *cools down*: an animated thermometer drops from +24°C to −18°C and the site darkens into the navy of a cold storage room, where the B2B Export Desk lives.

The palette is derived entirely from the existing Frosty Foods logo:

| | |
|---|---|
| Navy `#0C3352` | brand depth, B2B zone |
| Ice cyan `#39B9E4` | frozen accent, highlights |
| Fresh green `#3FBE23` | harvest, CTAs, "in season" |

Typography pairs **Bricolage Grotesque** (display) with **Instrument Sans** (body) for English, and **Alexandria** for Arabic — named after the company's own city.

## What was preserved

Everything brand-critical from the original site is kept intact:

- The original logo, hero video, and all 13 product photographs
- All product names and their real specifications — cuts and grades (e.g. okra graded Extra / Zero / One / Two), packing sizes (400 g · 1 kg · 2.5 kg · 10 kg), and storage temperature
- Actual harvest seasonality per product, taken from the original export table
- The six real certifications: BRC Food, ISO 22000, ISO 9001:2015, FSSC 22000, FDA, KLBD Kosher
- Packing possibilities and container loading figures (40 ft reefer: 2,400–2,600 cartons, etc.)
- The full 52-country list from the original quotation form
- Contact details, addresses, and social links

## What was added

The original site presented information but never asked for the sale, and it treated two very different audiences identically. This redesign separates and serves both.

**Proving B2B credibility**

- A dedicated **Export Desk** with an export market map and chips
- Capability cards — private label, retail packs, food service & bulk, brine/syrup drums
- Packing and container-loading tables with real figures
- A 5-step order flow: inquiry → quotation → samples & contract → production & QC → shipping & docs
- A **structured RFQ form**: company, country, business type, multi-select products, estimated volume, incoterm, packing preference, destination port — composing a formatted request to the export team
- Named certifications with context, plus an exhibition marquee (Gulfood, SIAL, Anuga, World Food)

**Clarifying the B2C journey**

- Dual-path hero: "Cook it tonight" (B2C) vs "Import & distribute" (B2B)
- Filterable product grid with detail modals showing cuts, packing, and harvest months
- A "from our farms to your freezer" timeline
- Kitchen tips (cook from frozen, storage, nutrition) and recipe cards
- A split FAQ — separate tabs for home cooks and for businesses

**New sections that didn't exist before**

- **Harvest calendar** — a 13 × 12 grid of real growing seasons with the current month highlighted, so importers can plan bookings
- **Live seasonality** — the top ticker and product badges compute from the current month automatically
- **IQF vs. block freezing** — an animated comparison explaining why the technology matters

## Technical notes

- Single self-contained `index.html`; no build step, no dependencies
- Full EN/AR bilingual support with RTL layout, persisted via `localStorage`
- Scroll-triggered reveals, animated counters, and reduced-motion support
- Responsive from 375 px upward

## Running locally

```bash
npx serve . -l 4360
```

Then open `http://localhost:4360`.

---

*Redesign concept by [Mohamed Tarek](https://github.com/Mohamed-sr-Designer). Brand assets, product photography, and company information belong to Frosty Foods.*
