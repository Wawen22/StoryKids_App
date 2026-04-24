# CLAUDE.md — Claude Code instructions for StoryKids AI

This file is loaded automatically by Claude Code at the start of every session.
Read it fully before taking any action. It supplements (never overrides) `AGENTS.md`.

---

## Key documents — read these first

| Document | Purpose |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Operating rules, golden rules, sprint scope, out-of-scope list |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, infra, ADRs, locked dependencies |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | **Color palette, typography, spacing, components** — Flutter design reference |
| [`docs/superpowers/specs/2026-04-22-storykids-mvp-design.md`](docs/superpowers/specs/2026-04-22-storykids-mvp-design.md) | MVP design spec, data model, API surface, sprint timeline |
| [`StoryKids_AI_Product_Doc.md`](StoryKids_AI_Product_Doc.md) | Product vision, monetization, personas, roadmap |
| [`docs/PRIVACY.md`](docs/PRIVACY.md) | GDPR rules — mandatory reading before any data-touching code |
| [`NEXT_STEPS.md`](NEXT_STEPS.md) | Current blockers and task list for the active sprint |

---

## Design system quick reference

> Full spec: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)

**Colors:**
- Background: `#FBF5EA` (cream)
- Primary / text: `#2D1B3D` (aubergine)
- CTA buttons: `#C9663F` (terracotta)
- Accents / badges: `#F3D5A7` (amber)

**Fonts:** Fraunces (headings, serif) · Manrope (body/UI, sans-serif) — both via `google_fonts`

**Grid:** 8 pt base unit · 24 pt horizontal screen padding · 56 pt button height

**Mockups:** drop PNGs in [`docs/mockups/`](docs/mockups/) named `01-welcome.png` … `07-preview-paywall.png`

---

## Behavior rules for this session

1. **Read `AGENTS.md` first.** All golden rules there take precedence.
2. **Never start Flutter screen work without a mockup.** Check `docs/mockups/` — if the relevant PNG is missing, stop and report the blocker.
3. **Match mockups pixel-precisely.** Use `docs/DESIGN_SYSTEM.md` as the Flutter implementation reference. Flag any contradiction between a mockup and this design system before writing code.
4. **Never hardcode UI strings.** Use `.arb` localization keys even in Sprint 1 (Italian only).
5. **Confirm before any destructive action** (`git reset --hard`, `DROP TABLE`, `prisma migrate reset`, `rm -rf`, force-push).
6. **Sprint 0 is a hard gate.** Do not build any Sprint 1 feature until `experiments/face-consistency-test/` has produced a human-reviewed HTML report with passing scores.

---

## Active blockers (check `NEXT_STEPS.md` for latest)

| Blocker | What's needed |
|---|---|
| B1 | Azure endpoint URL + deployment name for `gpt-image-2` |
| B2 | Mockup PNGs in `docs/mockups/` (7 screens) |
| B3 | Reference child photo in `experiments/face-consistency-test/input/reference-1.jpg` |
| B4 | External accounts (Supabase EU, R2, RevenueCat, Railway, Sentry, PostHog) — deferred to prod |
