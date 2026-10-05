# Carnaval of Screams: The Arrival

Campaign visual language for the 2026 site. Treat new UI as a continuation of the *The Arrival* key art: a lunar night, a planet overhead, skeletal towers, and white serif type in open dark space.

This is a movie poster, not a carnival stall.

## North star

Be there before the story unfolds.

The site should feel like you have already landed. Cold air, distant structures, a sky that is still turning. Premium, quiet, cinematic. Halloween is the occasion; the world is science-fiction arrival, not orange-and-purple fairground.

Reference: the *The Arrival* poster (Carnaval of Screams lockup, custom metallic wordmark, Trajan-like tagline, Artatix as official ticketing partner). The hero video and `stargate-poster.webp` are the same world. Keep using them.

## Do

- Dark navy / ink fields with moonlight, not gold foil
- White Angie serif for display, wide tracking, all caps
- High contrast: white on near-black
- Thin hairline borders in white at low opacity
- Atmosphere behind content (starfield, landscape stills, portal glow) with a heavy vignette so type stays readable
- Centered poster hierarchy: kicker → title → tagline → body
- Small red point-lights for status (sold out, alert), like the tower lamps in the key art
- Square or sharp-cornered panels for editorial surfaces (tickets, info)
- Generous vertical space; let the landscape breathe

## Do not

- Gold carnival tickets, perforated stubs, foil stamps
- Pink rubber-stamp “SOLD OUT” treatments
- Purple/pink festival gradients, mist-lilac body text on new surfaces
- Rounded “SaaS card” stacks with even padding and drop shadows
- Cyan neon UI, Orbitron, or generic sci-fi HUD chrome
- Dense bullet lists on marketing surfaces
- Competing poster type sitting at full opacity behind headlines (fade landscape; never stack *THE ARRIVAL* under *TICKETS*)

`--gold`, `--purple`, `--pink`, and `--mist` still exist in CSS from earlier work. Do not introduce them on new Arrival surfaces. Prefer white and ink. Existing gallery kickers that still use gold should be migrated when those screens are touched.

## Color

| Role | Value | Use |
| --- | --- | --- |
| Ink | `#050308` | Page ground, vignettes |
| Ink soft | `#0d0714` | Rare recessed surfaces; prefer glass over solid |
| White | `#ffffff` | Display type, primary fills, rules |
| White 70 / 55 / 40 / 30 | `text-white/70` etc. | Taglines, body, captions, disabled |
| Glass | `rgba(4, 7, 14, 0.52)` + `backdrop-filter: blur(18px)` | Pass panels, overlays |
| Hairline | `rgba(255, 255, 255, 0.12–0.35)` | Panel borders, title rules |
| Moonlight | `rgba(70, 100, 150, 0.18)` | Cool wash under landscape, never a fill |
| Signal | `#c4453a` + soft glow | Sold out / alert only. A 6px dot, not a banner. One exception: a taken table on the floor plan and in the table picker is filled Signal red with a cross or strike-through, so guests see at a glance it can't be picked |
| Nav pill | `#ffffff` on ink | Active tab only |

Buttons: white fill + black Angie (primary), ink fill + white hairline (secondary). Hover on primary inverts to ghost white. Do not use gold CTAs.

## Type

**Display / headings:** Angie (`--font-angie`, class `font-heading`). Always uppercase via `.font-heading`. Wide tracking (`0.08em`–`0.42em`). Soft white glow on hero-scale titles only (`pass-title`).

**Body:** Helvetica / Arial. Sentence case, relaxed leading, white at 55–65% opacity. Never set body in Angie except short labels (prices, kickers, partner lines).

**Scale (home)**

| Level | Size | Tracking | Example |
| --- | --- | --- | --- |
| Kicker | 11px–12px | `0.42em` | Carnaval of Screams |
| Page title | 3rem / 4.5rem | `0.14em` | Tickets |
| Tagline | 0.875rem / 1.25rem | `0.28em` | Be there before the story unfolds |
| Card name | ~1.7rem | `0.08em` | Early Bird |
| Price | 1.125rem | `0.12em` | Rp99.000 |
| Nav / CTA | 11px–14px | `0.12em`–`0.28em` | Get Tickets |

Lockups follow the poster: small event name, large section title, serif tagline, tiny partner line.

## Imagery & atmosphere

The world is one continuous night:

1. **Hero.** Looping stargate film (`VideoBackground` + `stargate-bg.mp4`), dark scrim, radial vignette. Wordmark is the COS 2026 logo, masked so it sits in the portal light.
2. **Tickets and later sections.** Still of the same landscape (`stargate-poster.webp`) anchored to the lower half, opacity ~0.7, graded back to ink at the top so headlines sit on sky. Optional WebGL `Starfield` for live sky; CSS `.starfield` is the fallback.
3. **Vignette.** Always darken edges. Type must not fight the planet or the portal.

Do not collage unrelated Halloween stock. If you add photography, grade it into this lunar blue-black.

## Layout

- Max content width: `max-w-6xl` with `px-6`.
- Sections: large vertical padding (`pt-24/32`, `pb-28/36`). Scroll margin `scroll-mt-28` under the fixed nav.
- Hero is full `h-svh`, centered stack.
- Marketing sections are centered like a poster; cards may go left-aligned inside the grid.
- Ticket grid: 1 / 2 / 4 columns (`sm:grid-cols-2`, `xl:grid-cols-4`), gap 1–1.25rem.
- Hairline under a card title is 2.5rem × 1px, not a full-width divider.

## Components

**Nav.** Fixed pill (`.t-tabs`). Frosted ink bar, white sliding pill on the current route. Hash links (e.g. Ticket → `/#tickets`) are not current-page.

**Hero CTAs.** Pill-shaped, glowing white halo, Angie. Primary = white fill. Secondary = black fill + white hairline. Used only on the hero.

**Pass panels.** Sharp glass (`.pass-panel`). Kicker left, signal status right. Name, hairline, price, meta, one-sentence description, full-width rectangular CTA. Sold-out panels dim slightly and replace the CTA with a ghost label. No perforation, no gold.

**Status.** Red signal dot + tracked “Sold Out”. One treatment only.

**Partner.** After ticketing copy: “Official Ticketing Partner” then **ARTATIX**, linking out to checkout.

**Footer.** Quiet, hairline top, white/45 icons. Hover to white, not gold.

## Motion

- Hero entrance: fade + 18px rise, ~700ms, ease `[0.23, 1, 0.32, 1]`, staggered.
- Buttons: `btn-press` scale 0.97 on active.
- Nav pill: 250ms width/transform.
- Sky: slow star drift or WebGL rotation; freeze entirely under `prefers-reduced-motion`.
- Prefer one staged reveal over scattered micro-interactions.

## Voice

English. Calm and specific. Short sentences. No hype adjectives, no emoji, no exclamation.

Use: *Be there before the story unfolds. Two nights, one pass. The first wave.*

Avoid: *Get ready for the scariest night of your life!!!*

Dates stay concrete (Friday 30 Oct / Saturday 31 Oct 2026). Venue is Tip Tap Toe Yogyakarta. One ticket = one person.

## File map

| Piece | Where |
| --- | --- |
| Tokens | `app/globals.css` (`:root`, `.pass-panel`, `.pass-title`, `.pass-signal`) |
| Display font | `app/fonts.ts` → `public/fonts/Angie-Regular.ttf` |
| Hero | `components/Hero.tsx`, `components/VideoBackground.tsx` |
| Tickets | `components/Tickets.tsx`, `lib/tickets.ts` |
| Reserve | `app/reserve/`, `components/ReserveForm.tsx`, `components/FloorPlanPlaceholder.tsx` |
| Ground | `components/ArrivalGround.tsx` |
| Sky | `components/Starfield.tsx` (WebGL), `.starfield` (CSS) |
| Checkout | `lib/site.ts` → `TICKETS_URL` |

When adding a page, start from the tickets section: ink ground, landscape or starfield, centered Angie lockup, glass hairline panels, white CTAs. If a mock looks like a carnival ticket, it is the wrong direction.
