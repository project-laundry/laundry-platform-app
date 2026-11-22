# NooraCare Brandbook

The visual language of NooraCare, as established by the customer order flow
(`src/app/orders/*`, `src/components/order-flow/*`). **Every page in the app
follows this guide.** When building or restyling UI, copy the recipes below
rather than inventing new variants.

The feel: a calm Nordic laundry service with a playful wink. Snø paper, Fjord
blue type and actions, soft Frost, and small bursts of Morgensol and Fersken —
the same mix as the logo, where a towel stack with eyes peeks over the edge
and two soap bubbles float up. Serif headlines, pill-shaped buttons, generous
rounding. Friendly, never loud or glossy.

---

## 1. Color

### The palette

| Name | Hex | Tailwind | Role |
| --- | --- | --- | --- |
| **Snø** | `#F7F5F0` | `sno` | Page background; text on Fjord |
| **Lin** | `#E9E1D3` | `lin` | Borders, dividers, quiet panels, disabled fills |
| **Frost** | `#9DBFCC` | `frost` | Soft blue fills, the lower towel in the logo, glows on Fjord |
| **Fjord** | `#1E3A4C` | `fjord` | All text, primary actions, the logo, dark hero surfaces |
| **Morgensol** | `#F0B84A` | `sol` | Playful accent: the logo's bubbles, highlights on Fjord, CTAs on Fjord |
| **Fersken** | `#F2A48C` | `fersken` | Warm secondary accent fills |

Plus one derived shade for readability:

| Name | Hex | Tailwind | Role |
| --- | --- | --- | --- |
| **Frost dyp** | `#3D6A7B` | `frost-deep` | Frost darkened to 5.4:1 on Snø — icons, eyebrows, selected states, links that need to read as "chosen" |

All colors are CSS variables in `src/app/globals.css`, exposed as Tailwind
utilities. Never hard-code hex values in components — the single exception is
Vipps orange, which is a third-party brand color.

**Contrast rule:** Morgensol, Fersken and Frost are *fills*, never text or
icons on Snø/white (all under 2:1). Use them as backgrounds behind Fjord text
(`bg-sol/35 text-fjord`), or as text/icons on Fjord (Morgensol on Fjord is
6.6:1).

### Role tokens

Most of the app uses role tokens that predate the palette. They now resolve to
it, so existing code is on-brand without renames. Either name is fine in new
code; prefer the palette name when you mean the brand color itself.

| Role token | Resolves to | Use |
| --- | --- | --- |
| `cream` | Snø | Page background; subtle inset panels (`bg-cream/70`) |
| `warm-white` | `#FDFCFA` (a hair lighter than Snø) | Card surfaces (`bg-warm-white/80` + `backdrop-blur`), header bars, sticky bars |
| `cream-dark` | Lin | Borders, dividers, disabled fills, skeletons |
| `nordic-blue` | Fjord | Primary actions, interactive icon color |
| `nordic-blue-light` | Frost | Soft blue accents |
| `sea-green` | Frost dyp | Selected states, toggles, progress, eyebrows, section icons |
| `sea-green-light` | Frost | Soft highlight |
| `dark-gray` | Fjord (`#1E3A4C`) | Primary text |
| `medium-gray` | `#586974` (Fjord-tinted gray, 5.2:1 on Snø) | Secondary text, labels, hints |
| `white` | — | Interactive rows/inputs sitting on a card |

**Semantic / status colors** (Tailwind defaults):

| Use | Recipe |
| --- | --- |
| Error / destructive note | `bg-red-50 text-red-700` note (see §4), `text-red-600` icons |
| Destructive action | `bg-red-600 text-white` pill button, or outline `border-red-200 text-red-600` |
| Warning | `bg-amber-50 text-amber-800` note |
| Success | Frost dyp, not a separate green: `bg-sea-green/10 text-sea-green` |
| Vipps | `#FF5B24` (inline style; buttons only) |

**Accent logic:** Fjord (`nordic-blue`) is what you *press*; Frost dyp
(`sea-green`) is what is *chosen or highlighted*. Morgensol and Fersken are
for *delight* — sparingly, and mostly on marketing surfaces: icon chips, step
numbers, the logo's bubbles, a highlighted headline word on Fjord, the CTA on
a Fjord hero. In the logged-in app, one playful touch per screen at most.

**Playful accent recipes:**

- Icon chips / step numbers cycle through the accent fills, Fjord icon on top:
  `bg-sol/35`, `bg-frost/45`, `bg-fersken/40` (see `ACCENT_CHIPS` in
  `src/components/coming-soon/ComingSoonShell.tsx`).
- Bubbles: two outlined circles in Morgensol, the small one up-left of the big
  one, as in the logo. Static decoration only, `aria-hidden`.
- Light hero (the coming-soon pages): a warm Lin surface (`bg-lin/60`) with
  the Frost glow from the top and a Fersken glow in a corner, Fjord type, the
  headline's second line marked with a Morgensol stroke behind the words
  (`bg-sol/70` fill — never `text-sol` on light), the form in a white card,
  an optional photo (beside the copy from `lg`, dropped on phones and tablets
  in portrait), rounded bottom edge
  (`rounded-b-[2.5rem] sm:rounded-b-[4rem]`).
- Fjord block (closing CTA, share images — mirrors the secondary logo):
  `bg-fjord text-sno`, highlight in `text-sol`, CTA `bg-sol text-fjord`. One
  per page at most.

**Backdrop:** pages get a fixed atmospheric wash over the cream base:

```tsx
<div className="min-h-screen bg-cream text-dark-gray">
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 -z-10"
    style={{
      background:
        'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
    }}
  />
  …
</div>
```

**Retired:** the old “aurora” look — `bg-aurora`, `text-gradient`,
`gradient-nordic`, floating blur blobs, gradient logo squares, `shadow-glow` —
is not part of the brand. Don't use it. The pre-2026-10 sea-green/nordic-blue
palette is also retired; the token names survive only as roles (above).

## 2. Typography

Fonts are loaded in `src/app/layout.tsx` and mapped in `globals.css`:

- **Fraunces** (`font-serif`) — headlines, section titles, prices, numbers
  with personality. Variable font with optical sizing; typically
  `font-semibold`.
- **Jost** (`font-sans`, the default) — body text, labels, buttons.
- **Geist Mono** (`font-mono`) — rarely; order numbers or codes if needed.

| Element | Recipe |
| --- | --- |
| Page title | `font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl` |
| Eyebrow above title | `text-sm font-medium uppercase tracking-[0.18em] text-sea-green` |
| Page subtitle | `mt-3 max-w-md text-medium-gray` |
| Section/card title | `font-serif text-lg font-semibold text-dark-gray` |
| Body | default Jost, `text-dark-gray` |
| Secondary text / hints | `text-sm text-medium-gray` |
| Tiny label (sticky bar, meta) | `text-xs uppercase tracking-[0.14em] text-medium-gray` |
| Price / big number | `font-serif text-2xl font-semibold tabular-nums text-dark-gray` |
| Logo | The `Wordmark` component — the primary logo PNG (towel stack with eyes + bubbles, "noora**care**"), `h-8 w-auto`. `tone="light"` uses the negative version on Fjord. Never re-typeset the logo as text. |

Always add `tabular-nums` to prices, counts and dates that change in place.

### Logo files

All in `src/assets/brand/` (import them; `next/image` reads the size):
`primaerlogo.png` / `primaerlogo-negativ.png` (horizontal, used by `Wordmark`),
`sekundaerlogo.png` / `sekundaerlogo-negativ.png` (stacked), `submerke.png`
(round badge), `favicon-512.png`. The favicon and Apple touch icon are
`src/app/icon.png` and `src/app/apple-icon.png` (Next.js file conventions).

**Social share images** (`opengraph-image.tsx` per route) go through `src/lib/og-image.tsx`:
Fjord background with the Frost glow, the stacked negative logo on the left, a Fraunces
headline with the second line in Morgensol, and a Morgensol dot before "nooracare.no ·
Bergen og Oslo". Hex values are allowed there because Satori can't read CSS variables.

## 3. Shape, elevation, spacing

| Element | Radius |
| --- | --- |
| Cards / sections | `rounded-3xl` |
| Interactive rows, inputs, chips, notes | `rounded-2xl` |
| Small choice chips (segmented options) | `rounded-xl` |
| Buttons, icon buttons, toggles, avatars | `rounded-full` |

Shadows are soft and sparse — cards get `shadow-[var(--shadow-card)]`, primary
buttons `shadow-soft`. Nothing else. No rings except focus states.

Layout: content columns are centered and narrow — `mx-auto max-w-2xl px-5` for
flows and focused pages, up to `max-w-5xl` for dashboards/tables. Vertical
rhythm between sections: `mt-6`.

## 4. Core components

### Page shell

Full-height cream page + backdrop (§1), the shared header bar, centered main
column. **Always use `AppHeader` from `src/components/layout/AppHeader.tsx`** —
never hand-roll the bar. It is sticky and translucent, anchors the wordmark on
the **left on every page** (the brand anchor never moves), and takes
page-specific content via `right`. Back navigation is **not** part of the bar:
render a `BackLink` at the top of the content column instead.

```tsx
<AppHeader />                                                  // flows & detail pages
<AppHeader maxWidth="max-w-5xl" right={<LogoutButton />} />    // dashboards
<main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
  <div className="mb-4">
    <BackLink href="/dashboard" />
  </div>
  …
</main>
```

The wordmark itself is the `Wordmark` component (also used by the marketing
navbar/footer), and `BackLink` is the one back-link recipe (`‹ Tilbake`,
medium-gray → nordic-blue on hover).

The only pages not using `AppHeader` are the marketing surfaces (landing
`Navbar`, bli-renser landing nav) — they carry nav links and auth CTAs but
share the same bar metrics (`px-5 py-3`, `border-cream-dark/70`,
`bg-warm-white/70 backdrop-blur`) and the `Wordmark`.

### Card / section

```tsx
<div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
```

Section headers inside a card pair a round icon chip with a serif title:

```tsx
<span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
  <MapPin className="size-5" />
</span>
```

Lists inside a card divide with `divide-y divide-cream-dark/60`; rows use
`px-5 py-3.5`.

### Buttons

Primary (nordic-blue pill):

```tsx
className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
```

Secondary (outline pill):

```tsx
className="inline-flex items-center gap-2 rounded-full border border-cream-dark bg-white px-6 py-3.5 font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
```

Destructive: primary recipe with `bg-red-600` (or the outline recipe with
`border-red-200 text-red-600 hover:border-red-400`). Vipps: primary recipe with
`style={{ backgroundColor: '#FF5B24' }}` and `font-semibold`.

Text/link button: `font-medium text-sea-green underline-offset-2 hover:underline`
(inline) or `text-nordic-blue` for navigation links.

Icon button (steppers etc.): `flex size-11 items-center justify-center
rounded-full border border-cream-dark bg-white text-nordic-blue shadow-sm
transition-all hover:border-sea-green hover:text-sea-green active:scale-90` —
`size-9` for the compact variant.

### Form fields

Label + input, stacked:

```tsx
<label className="block">
  <span className="mb-1.5 block text-sm font-medium text-dark-gray">Gateadresse</span>
  <input className="w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20" />
</label>
```

The same input recipe applies to `<textarea>` (add `resize-none`) and
`<select>`. Read-only/derived fields swap `bg-white` for `bg-cream/50`.

### Selectable cards & chips

Anything choosable shares one state pattern — sea-green when active:

```tsx
className={active
  ? 'border-sea-green bg-sea-green/8'        // or /10 with text-sea-green for chips
  : 'border-cream-dark bg-white hover:border-sea-green/50'}
```

on a `rounded-2xl border px-4 py-3 text-left transition-all` base (chips:
`rounded-xl`, centered). Toggles are `h-7 w-12 rounded-full` switches filling
`bg-sea-green` when on, `bg-cream-dark` when off, with a white thumb.

### Notes & alerts

One shape for info, error, warning — a rounded quiet strip with a leading icon:

```tsx
<div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
  <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
  <p>…</p>
</div>
```

Error: `bg-red-50 … text-red-700` with `AlertCircle`. Warning: `bg-amber-50 …
text-amber-800`. Emphasized/dashed callout: `border border-dashed
border-sea-green/40 bg-sea-green/5 px-4 py-3`.

### Status badges

`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium` with
tinted fills: sea-green (`bg-sea-green/10 text-sea-green`) for active/positive,
`bg-cream-dark/60 text-medium-gray` for neutral/past, `bg-amber-50
text-amber-800` for pending, `bg-red-50 text-red-700` for problems.

### Progress

Step progress is a row of `h-1.5 flex-1 rounded-full` bars — `bg-sea-green`
for reached steps, `bg-cream-dark` for the rest.

### Sticky action bar

Flows with a persistent CTA pin it bottom, translucent:

```tsx
<div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
  <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">…</div>
</div>
```

Give the page `pb-44` so content clears the bar.

## 5. Motion

Subtle entrances only, via `tw-animate-css`:

- Sections/pages: `animate-in fade-in slide-in-from-bottom-3 duration-500`
  (stagger siblings with `style={{ animationDelay: '60ms' }}` steps of ~60ms).
- Revealed content: `animate-in fade-in slide-in-from-top-1 duration-300`.
- Skeletons: `animate-pulse rounded-2xl bg-cream-dark/50`.
- Press feedback: `active:scale-[0.98]` (buttons), `active:scale-90` (icon buttons).

Marketing illustrations may loop (the "Slik virker det" story: floating phone,
spinning drum, rising bubbles, pulsing rings — tokens `animate-float`,
`animate-drum`, `animate-rise`, `animate-ring` etc. in `globals.css`). Always
put loops behind `motion-safe:` so reduced-motion users get a still picture.
In the logged-in app, stick to the entrance animations above.

## 6. Iconography

`lucide-react` only. Default `size-4` inline / `size-5` in icon chips.
Interactive icons are `text-nordic-blue`; decorative/selected accents are
`text-sea-green`; muted illustrations `text-cream-dark` (e.g. empty states).
On marketing surfaces, icons may sit in a playful accent chip (§1).

## 7. Voice

Norwegian (bokmål), warm, direct and a little playful — “Hva skal vi vaske?”, “Hvor henter vi?”.
Sentence case everywhere (no Title Case), questions welcome in headings,
“vi”/“du” voice, no exclamation-mark enthusiasm. Prices always formatted via
`formatKr` from `lib/config/pricing`.

## 8. Checklist for new UI

- [ ] Snø page + radial backdrop, `warm-white` cards with `rounded-3xl`
- [ ] Fraunces headline + eyebrow, Jost body
- [ ] Morgensol/Fersken/Frost only as fills (never text on light), and sparingly
- [ ] Pills for buttons, Frost dyp (`sea-green`) for selection, Fjord (`nordic-blue`) for actions
- [ ] Inputs per §4, focus ring `sea-green/20`
- [ ] No aurora gradients, no gradient text, no hard-coded colors
- [ ] `tabular-nums` on live numbers; `formatKr` for money
- [ ] Entrance animation on main content; loops only on marketing illustrations, behind `motion-safe:`
