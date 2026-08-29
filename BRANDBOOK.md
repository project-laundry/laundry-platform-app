# NooraCare Brandbook

The visual language of NooraCare, as established by the customer order flow
(`src/app/orders/*`, `src/components/order-flow/*`). **Every page in the app
follows this guide.** When building or restyling UI, copy the recipes below
rather than inventing new variants.

The feel: a calm, warm Nordic laundry service. Cream paper, soft sea-green and
deep blue accents, serif headlines, pill-shaped buttons, generous rounding.
Nothing loud, nothing glossy.

---

## 1. Color

All colors are defined as CSS variables in `src/app/globals.css` and exposed as
Tailwind utilities (`bg-cream`, `text-nordic-blue`, `border-cream-dark`, …).
Never hard-code hex values in components — the single exception is Vipps
orange, which is a third-party brand color.

| Token | Tailwind | HSL | Role |
| --- | --- | --- | --- |
| `--cream` | `cream` | `42 30% 96%` | Page background; subtle inset panels (`bg-cream/70`) |
| `--warm-white` | `warm-white` | `40 40% 98%` | Card surfaces (`bg-warm-white/80` + `backdrop-blur`), headers, sticky bars |
| `--cream-dark` | `cream-dark` | `42 25% 88%` | Borders, dividers, disabled fills, skeletons |
| `--nordic-blue` | `nordic-blue` | `200 50% 35%` | Primary actions, logo, interactive icon color |
| `--nordic-blue-light` | `nordic-blue-light` | `200 45% 55%` | Rare — softer blue accents |
| `--sea-green` | `sea-green` | `175 35% 45%` | The accent: selected states, toggles, progress, eyebrows, info icons |
| `--sea-green-light` | `sea-green-light` | `175 40% 60%` | Rare — softer green accents |
| `--dark-gray` | `dark-gray` | `#1e293b` | Primary text |
| `--medium-gray` | `medium-gray` | `#64748b` | Secondary text, labels, hints |
| white | `white` | — | Interactive rows/inputs sitting on a card |

**Semantic / status colors** (Tailwind defaults):

| Use | Recipe |
| --- | --- |
| Error / destructive note | `bg-red-50 text-red-700` note (see §6), `text-red-600` icons |
| Destructive action | `bg-red-600 text-white` pill button, or outline `border-red-200 text-red-600` |
| Warning | `bg-amber-50 text-amber-800` note |
| Success | sea-green, not a separate green: `bg-sea-green/10 text-sea-green` |
| Vipps | `#FF5B24` (inline style; buttons only) |

**Accent logic:** nordic-blue is what you *press* (primary buttons, links,
stepper icons); sea-green is what is *chosen or highlighted* (active cards,
toggles on, progress, section icons, eyebrow labels). Don't swap them.

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
is not part of the brand. Don't use it.

## 2. Typography

Fonts are loaded in `src/app/layout.tsx` and mapped in `globals.css`:

- **Source Serif 4** (`font-serif`) — headlines, section titles, prices,
  numbers with personality. Weights 400–700, typically `font-semibold`.
- **Inter** (`font-sans`, the default) — everything else. Weights 300–600.
- **Geist Mono** (`font-mono`) — rarely; order numbers or codes if needed.

| Element | Recipe |
| --- | --- |
| Page title | `font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl` |
| Eyebrow above title | `text-sm font-medium uppercase tracking-[0.18em] text-sea-green` |
| Page subtitle | `mt-3 max-w-md text-medium-gray` |
| Section/card title | `font-serif text-lg font-semibold text-dark-gray` |
| Body | default Inter, `text-dark-gray` |
| Secondary text / hints | `text-sm text-medium-gray` |
| Tiny label (sticky bar, meta) | `text-xs uppercase tracking-[0.14em] text-medium-gray` |
| Price / big number | `font-serif text-2xl font-semibold tabular-nums text-dark-gray` |
| Logo wordmark | `font-serif text-2xl font-semibold text-nordic-blue` — plain serif text “NooraCare”, no icon box |

Always add `tabular-nums` to prices, counts and dates that change in place.

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

No floating/shimmer/bounce loops, no parallax, nothing that moves unprompted.

## 6. Iconography

`lucide-react` only. Default `size-4` inline / `size-5` in icon chips.
Interactive icons are `text-nordic-blue`; decorative/selected accents are
`text-sea-green`; muted illustrations `text-cream-dark` (e.g. empty states).

## 7. Voice

Norwegian (bokmål), warm and direct — “Hva skal vi vaske?”, “Hvor henter vi?”.
Sentence case everywhere (no Title Case), questions welcome in headings,
“vi”/“du” voice, no exclamation-mark enthusiasm. Prices always formatted via
`formatKr` from `lib/config/pricing`.

## 8. Checklist for new UI

- [ ] Cream page + radial backdrop, `warm-white` cards with `rounded-3xl`
- [ ] Serif headline + eyebrow, Inter body
- [ ] Pills for buttons, sea-green for selection, nordic-blue for actions
- [ ] Inputs per §4, focus ring `sea-green/20`
- [ ] No aurora gradients, no gradient text, no hard-coded colors
- [ ] `tabular-nums` on live numbers; `formatKr` for money
- [ ] Entrance animation on main content, nothing looping
