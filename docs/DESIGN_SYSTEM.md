# StoryKids AI — Design System

**Status:** Approved · **Last updated:** 2026-04-24
**Audience:** Flutter developers, AI coding agents, designers adding screens.

> Before building any screen, read this document fully. Pixel-precise fidelity to the design system is a non-negotiable requirement (see `AGENTS.md` rule 8).

---

## 1. Brand essence

StoryKids AI turns a child's real face into the protagonist of a personalized fairy tale. Every design decision must serve one goal: **make the parent feel magic**. The product is not a tool — it is an emotional memory. Screens must feel warm, premium, and storybook-like. Never clinical, never generic.

Guiding emotion per screen phase:

| Phase | Emotion to evoke |
|---|---|
| Welcome | Wonder — "I want to open this book" |
| Onboarding steps | Lightness — "This is easy and fun" |
| Generating | Anticipation — "Something magical is being created for us" |
| Preview + paywall | Pride + FOMO — "I need to keep this forever" |

---

## 2. Color palette

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#FBF5EA` | Default background on every screen. Paper-like warmth. |
| `aubergine` | `#2D1B3D` | Primary text, deep accents, selected states, card overlays. |
| `terracotta` | `#C9663F` | **All primary CTAs** (buttons, confirm actions). Never use on text over cream bg. |
| `amber` | `#F3D5A7` | Highlights, badges, secondary accents, focus rings. |
| `cream-dark` | `#EDE5D4` | Subtle card surfaces, dividers, unselected states. |
| `aubergine-80` | `#2D1B3D` at 80% opacity | Paywall overlay, modal scrim. |
| `white` | `#FFFFFF` | Text on aubergine/terracotta surfaces only. |

### Forbidden color combos

- Never use terracotta text on cream background (contrast fails AA).
- Never use amber as a CTA background (too low contrast for text).
- Never introduce grays — map every neutral to `cream`, `cream-dark`, or `aubergine` at reduced opacity.

### Flutter color tokens (MaterialColor + ColorScheme)

```dart
// theme/app_colors.dart
class AppColors {
  static const cream       = Color(0xFFFBF5EA);
  static const aubergine   = Color(0xFF2D1B3D);
  static const terracotta  = Color(0xFFC9663F);
  static const amber       = Color(0xFFF3D5A7);
  static const creamDark   = Color(0xFFEDE5D4);
}
```

---

## 3. Typography

### Typefaces

| Role | Family | Weight(s) | Notes |
|---|---|---|---|
| Display / Headings | **Fraunces** | Regular (400), SemiBold (600) | Serif. Evokes storybook warmth. Used for all screen titles. |
| Body / UI | **Manrope** | Regular (400), Medium (500), Bold (700) | Clean sans-serif. Used for all body copy, buttons, labels, captions. |

Both available via `google_fonts` package. No other typefaces are permitted.

### Type scale

| Style token | Family | Size | Weight | Line height | Usage |
|---|---|---|---|---|---|
| `displayLarge` | Fraunces | 32 sp | 600 | 40 sp | Welcome screen hero heading |
| `displayMedium` | Fraunces | 26 sp | 400 | 34 sp | Screen titles ("Chi è il protagonista?") |
| `titleLarge` | Fraunces | 22 sp | 400 | 30 sp | Card headings, story title |
| `bodyLarge` | Manrope | 16 sp | 400 | 24 sp | Primary body copy, input labels |
| `bodyMedium` | Manrope | 14 sp | 400 | 20 sp | Subtexts, captions, helper text |
| `labelLarge` | Manrope | 16 sp | 700 | 24 sp | CTA button labels |
| `labelSmall` | Manrope | 11 sp | 500 | 16 sp | Legal/fine print, progress labels |

### Flutter snippet

```dart
// theme/app_typography.dart
TextTheme buildTextTheme() => TextTheme(
  displayLarge:  GoogleFonts.fraunces(fontSize: 32, fontWeight: FontWeight.w600, height: 1.25),
  displayMedium: GoogleFonts.fraunces(fontSize: 26, fontWeight: FontWeight.w400, height: 1.31),
  titleLarge:    GoogleFonts.fraunces(fontSize: 22, fontWeight: FontWeight.w400, height: 1.36),
  bodyLarge:     GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w400, height: 1.5),
  bodyMedium:    GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w400, height: 1.43),
  labelLarge:    GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700, height: 1.5),
  labelSmall:    GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w500, height: 1.45),
);
```

---

## 4. Spacing & grid

- **Base unit:** 8 pt
- All padding, margin, and gap values must be multiples of 8 (4 pt allowed only for fine adjustments within components)
- **Screen horizontal padding:** 24 pt (left and right)
- **Card inner padding:** 20 pt
- **Gap between sections:** 32 pt
- **Gap between form fields:** 16 pt

### Safe areas

Always respect Flutter's `SafeArea`. Key areas:
- **Top:** status bar (do not overlap with content)
- **Bottom:** home indicator — all sticky CTAs sit above via `SafeArea` + 16 pt extra padding

---

## 5. Shape & elevation

| Component | Border radius | Shadow |
|---|---|---|
| Primary CTA button | 16 pt (pill-like) | None |
| Cards | 24 pt | `BoxShadow(color: aubergine @ 8%, blurRadius: 16, offset: (0, 4))` |
| Bottom sheets / modals | 28 pt top corners | Standard Material elevation |
| Input fields | 14 pt | No shadow; amber border on focus (2 pt) |
| Theme/style picker cards | 20 pt | Same as cards |
| Photo upload slots | 16 pt | Dashed border (2 pt, `cream-dark`) when empty |
| Pill chips (occasion, gender) | 999 pt (full pill) | None |

---

## 6. Components

### Primary CTA button

- Background: `terracotta`
- Text: `white`, `labelLarge`
- Width: full-width (stretch to screen minus 24 pt each side)
- Height: 56 pt
- Border radius: 16 pt
- Disabled state: `cream-dark` bg, `aubergine @ 40%` text
- Position: sticky to bottom safe area on all onboarding screens

```dart
ElevatedButton(
  style: ElevatedButton.styleFrom(
    backgroundColor: AppColors.terracotta,
    foregroundColor: Colors.white,
    minimumSize: const Size.fromHeight(56),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    elevation: 0,
  ),
  onPressed: isEnabled ? onTap : null,
  child: Text('Avanti →', style: Theme.of(context).textTheme.labelLarge),
)
```

### Progress bar (onboarding steps)

- Thin bar (4 pt height), full width
- Background: `cream-dark`
- Fill: `aubergine`
- Animated fill with step progress
- Sits directly below the status bar, above back arrow

### Form inputs

- Background: `cream`
- Border: 1.5 pt `cream-dark` default, 2 pt `amber` on focus
- Border radius: 14 pt
- Label: `bodyMedium`, `aubergine @ 60%` (above the field)
- Input text: `bodyLarge`, `aubergine`
- Height: 56 pt

### Selection cards (themes, art styles)

- Default: `cream` bg, `cream-dark` border (1.5 pt)
- Selected: `aubergine` border (2.5 pt) + amber `✦` badge top-right
- Illustration area: upper ~60% of card
- Label: `titleLarge` (Fraunces), `aubergine`, bottom 40%

### Pill chips (gender, occasions)

- Default: `cream-dark` bg, `aubergine` text (`bodyMedium`)
- Selected: `aubergine` bg, `white` text
- Height: 36 pt, horizontal padding: 16 pt

### Photo upload slots

- 2-column grid, slots are square
- Empty: dashed border 2 pt `cream-dark`, `+` icon center in `aubergine @ 40%`
- Filled: photo preview with rounded corners, small amber `✓` badge bottom-right
- Minimum 3 required: show "X/5 foto" counter below grid in `bodyMedium`

### Paywall card

- Background: `aubergine`
- All text: `white` or `amber`
- Border radius: 24 pt (top) — slides up from bottom of screen
- Price options: stacked list, each row 64 pt tall
- Highlighted option: `amber` left border (4 pt) + "Più scelto" badge (amber bg, aubergine text)
- Primary CTA inside card: `terracotta` button (same spec as above)

---

## 7. Illustration & decorative elements

- All decorative illustrations use a **soft painterly / watercolor** style
- Palette: warm earth tones within the brand palette — no saturated primaries
- Decorative motifs: small stars `✦`, sparkles, loose brushstrokes, soft glows
- Never use stock-looking clipart or flat icon sets for illustrations
- Icons (UI only — back arrows, checkmarks, padlock): use `phosphor_flutter` or Material Icons; keep them in `aubergine` or `white` depending on background

### Do / Don't

| Do | Don't |
|---|---|
| Soft watercolor splash behind a heading | Hard drop shadows on illustrations |
| Small amber star badge on a card | Emoji-heavy headings |
| Fraunces for story titles | System default font anywhere |
| Cream background with aubergine text | White (#FFF) as a screen background |
| Rounded, generous cards | Square-cornered containers |

---

## 8. The 7 Sprint 1 screens

These are the only screens to build in Sprint 1. Each must pixel-precisely match the corresponding mockup in [`docs/mockups/`](mockups/).

| # | File | Screen name | Primary action |
|---|---|---|---|
| 1 | `01-welcome.png` | Welcome | "Crea la tua storia →" |
| 2 | `02-child-details.png` | Child details | Name, age, gender input |
| 3 | `03-photo-upload.png` | Photo upload | Upload 3–5 photos |
| 4 | `04-theme-picker.png` | Theme picker | Pick 1 of 6 themes + occasion |
| 5 | `05-art-style.png` | Art style picker | Pick 1 of 4 art styles |
| 6 | `06-generating.png` | Generating | Progress + animated wait |
| 7 | `07-preview-paywall.png` | Preview + paywall | 3 free pages + unlock CTA |

**Rule:** If a mockup contradicts this document, stop and flag it — do not silently pick one over the other.

---

## 9. Localization note

All UI copy in Sprint 1 is in **Italian**. Architecture must support i18n (use Flutter's `AppLocalizations` / `intl` package with `.arb` files) but only the `it` locale is shipped at MVP. Never hardcode strings directly in widgets — always reference a localization key.

---

## 10. Accessibility

- All text must meet **WCAG AA** contrast ratio (4.5:1 for body, 3:1 for large text)
- Interactive tap targets: minimum 48 × 48 pt
- Semantic labels on all images and icon buttons
- Support system font scaling up to 130% without layout breaks (use `textScaleFactor`-safe layouts)
