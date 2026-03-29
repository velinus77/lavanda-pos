# Lavanda POS Design System

## Product Character

Lavanda POS should feel like a calm, premium operations console for a pharmacy team.

Not a startup landing page.
Not a generic admin theme.
Not a hospital dashboard that feels cold and sterile.

The product should communicate:

- trust
- precision
- composure under pressure
- operational seriousness
- warmth without softness

The user should feel like the software is helping them run a disciplined store, not asking them to fight a spreadsheet with nicer buttons.

## Design Intent

This product has two visual jobs:

1. Make regulated, detail-heavy work feel controlled.
2. Make daily pharmacy work feel lighter, clearer, and less stressful.

That means the system should combine:

- dark operational surfaces for focus
- warm neutral backgrounds for trust
- restrained luxury accents for brand
- green as the action color for “go”, “confirm”, and workflow progress

Gold is brand.
Green is action.
Red is risk.
Blue is information.
Purple is not part of the primary system.

## Core Aesthetic

Think:

- premium pharmacy operations room
- leather ledger meets modern POS
- warm paper and brass in the login/public feel
- slate, graphite, and focused task lighting in the authenticated app

The site should feel composed and elegant, but never decorative for its own sake.

## Color System

### Brand Neutrals

- `bg/base-light`: `#f4f1eb`
- `bg/card-light`: `#fffdf8`
- `bg/surface-light`: `#f8f5ef`
- `border-light`: `#d5d0c6`
- `text-strong-light`: `#162033`
- `text-muted-light`: `#6a7486`

- `bg/base-dark`: `#0d1420`
- `bg/card-dark`: `#111a27`
- `bg/surface-dark`: `#162133`
- `border-dark`: `#253144`
- `text-strong-dark`: `#f4ede2`
- `text-muted-dark`: `#94a0b4`

### Brand Accent

Use for logos, editorial labels, premium highlights, and subtle emphasis.

- `brand-gold`: `#9c7a45`
- `brand-gold-strong`: `#7e6033`
- `brand-gold-dark`: `#b8945a`
- `brand-gold-highlight`: `#d2ae71`

### Action Accent

Use for primary CTAs, positive flow progression, active confirmation, successful operations.

- `action-green`: `#1f9d73`
- `action-green-strong`: `#147a59`
- `action-green-soft`: `#d8efe7`
- `action-green-dark`: `#17342c`

### Semantic

- `info-blue`: `#3f6f9d`
- `info-blue-soft`: `#dce8f4`
- `warn-amber`: `#a06f23`
- `warn-amber-soft`: `#f2e9d9`
- `danger-red`: `#8c4d40`
- `danger-red-soft`: `#f8ebe8`

## Color Rules

- Gold never drives the main task flow.
- Green is the default primary action color.
- Gold can be used for premium highlights, badges, section overlines, and branded controls.
- Avoid mixing green and purple in the same task surface.
- Avoid bright saturated accents on dark surfaces unless the element is truly critical.

## Typography

### Tone

Typography should feel precise, slightly editorial, and modern.

### English

Recommended direction:

- Primary UI sans: a clean grotesk with a bit of personality
- Good options: `Manrope`, `Sora`, `Plus Jakarta Sans`, `IBM Plex Sans`

Best fit for this product:

- `Manrope` for UI and dashboards

Why:

- clean under dense data
- feels modern without looking default
- works well at both headline and control sizes

### Arabic

Recommended direction:

- `IBM Plex Sans Arabic` or `Noto Sans Arabic`

Best fit:

- `IBM Plex Sans Arabic`

Why:

- stable and legible in operational UI
- pairs reasonably well with a modern Latin grotesk
- avoids overly calligraphic styling in dense forms

### Type Scale

- Display: `40/44`, semibold, tracking `-0.04em`
- Page title: `30/36`, semibold, tracking `-0.03em`
- Section title: `20/28`, semibold, tracking `-0.02em`
- Card title: `18/24`, semibold
- Body: `15/24`
- Small body: `14/20`
- UI label: `13/18`, medium
- Overline: `11/16`, semibold, uppercase, tracking `0.24em` to `0.32em`

### Typography Rules

- Use uppercase overlines sparingly for section framing.
- Avoid more than one overline plus one title per card.
- Don’t stack too many headline styles in one viewport.
- Dashboards should be legible first, expressive second.

## Shape Language

Current UI is leaning into generous rounding. Keep it, but make it systematic.

### Radius Scale

- `r-sm`: `12px`
- `r-md`: `16px`
- `r-lg`: `20px`
- `r-xl`: `24px`
- `r-hero`: `28px`
- `r-shell`: `32px`

### Usage

- Inputs: `16px`
- Buttons: `16px` to `18px`
- Cards: `24px`
- Hero and shell containers: `28px` to `32px`
- Sidebar icon chips: `16px`

Do not introduce random `rounded-[37px]` style values without a system reason.

## Layout

### Page Structure

Authenticated pages should use a 3-layer structure max:

1. App shell
2. Page header
3. Page content blocks

Avoid:

- shell card
- page card
- hero card
- section card
- subcard

all in the same initial viewport. Too much framing makes the page feel boxed in.

### Width

- Main content max width: `1440px`
- Dense data views can use full available width inside shell
- Login and auth forms should cap around `440px` to `520px`

### Spacing Rhythm

- Page outer padding: `24px` mobile, `32px` desktop
- Between major sections: `24px` to `32px`
- Card internal padding: `20px` to `24px`
- Form control vertical rhythm: `16px` to `20px`

## Motion

Motion should be minimal but intentional.

### Allowed

- fade and slight rise on page content mount
- sidebar slide on mobile
- hover lift on actionable cards
- subtle background transition on theme switch
- button press states

### Avoid

- bouncy motion
- flashy gradients moving constantly
- generic animation on every card
- loading shimmer everywhere

### Timing

- micro transitions: `140ms` to `180ms`
- panel open/close: `220ms` to `280ms`
- ease: standard ease-out for entry, ease-in-out for toggles

## Surfaces

### Login / Public

Use warm neutrals, gold brand accents, soft layered light, slightly editorial composition.

The login page should feel premium and trustworthy.

### Authenticated Shell

Use dark shell chrome with lighter content surfaces.

Rules:

- sidebar can stay dark and branded
- content region should feel quieter
- header should support the page, not dominate it

### Data Surfaces

Cards, tables, forms, and stats should all feel like part of one family.

Shared traits:

- soft borders
- low-noise backgrounds
- careful shadow use
- clear hierarchy inside the card

## Component Guidance

### Buttons

Primary:

- action green background
- white text
- stronger hover state
- use for submit, confirm, continue, save

Secondary:

- surface background
- bordered
- text in foreground or muted depending on importance

Tertiary:

- text/button hybrid
- no heavy container unless needed

Gold buttons should be rare and mostly reserved for branded or editorial use.

### Inputs

Inputs should feel stable and serious.

Rules:

- uniform height
- clear focus ring
- labels always visible
- helper text below when needed
- error states use red border plus short explanation, not giant red blocks unless the whole form failed

### Cards

Every card should answer:

- what is this
- what matters here
- what can I do here

If a card has more than one of those but no visual grouping, it needs redesign.

### Tables

Not fully designed yet in code, but target rules are:

- strong row separation without heavy gridlines
- sticky headers where useful
- one accent color for interactive rows
- muted metadata
- avoid tiny action icons with no labels

### Alerts

- red for destructive or blocked
- amber for attention needed
- blue for informative guidance
- green for success

Alerts should be compact and contextual where possible.

## Page-Level Guidance

### Login

Keep:

- premium warm atmosphere
- strong brand block
- focused, single-card sign-in

Improve:

- align copy tone with operational seriousness
- ensure Arabic rendering stays correct
- use green for primary sign-in CTA

### Dashboard

Goal:

- less “executive marketing panel”
- more “useful opening view for today’s work”

Keep:

- summary hero
- stats grid
- quick links

Improve:

- reduce duplicated framing
- use one stronger primary metric area
- make quick links feel task-oriented, not decorative

### Sidebar

This is currently the strongest element.

Keep:

- dark premium tone
- compact nav groups
- solid active state

Improve:

- active state can be slightly more surgical
- icons and labels should feel tighter vertically

### Inventory / Stock

This is the biggest design opportunity.

Current issue:

- too many controls feel equal
- dense form surfaces still read like admin scaffolding

Target:

- batch selection and new-batch creation are visibly different modes
- warnings feel supportive, not noisy
- the page should guide the next action naturally

## Content Voice

The product voice should sound:

- calm
- clear
- operational
- respectful

Avoid:

- startup marketing fluff inside the app
- overly dramatic warnings
- robotic enterprise copy

Examples:

- Good: `No active batches available for this product`
- Bad: `Action cannot be completed due to inventory batch unavailability`

## Accessibility

Minimum rules:

- color contrast always passes on dark surfaces
- focus visible on all controls
- never rely on color alone for status
- keyboard paths must work for forms and shell navigation
- Arabic and English layouts both need first-class spacing and readability

## Implementation Rules For This Repo

### Tokens

Move toward a single token source in [globals.css](/c:/Users/X/Desktop/lavanda/apps/web/src/app/globals.css).

Add:

- action green tokens
- semantic status tokens
- spacing and radius documentation in comments or companion docs

### Do Not

- reintroduce purple primary actions
- add random one-off shadows
- invent page-specific color systems
- encode large translation blobs inline in many components forever

### Preferred Next Refactors

1. Normalize tokens in [globals.css](/c:/Users/X/Desktop/lavanda/apps/web/src/app/globals.css)
2. Update [LoginForm.tsx](/c:/Users/X/Desktop/lavanda/apps/web/src/components/LoginForm.tsx) to use green primary action and cleaner language switch controls
3. Simplify [layout.tsx](/c:/Users/X/Desktop/lavanda/apps/web/src/app/dashboard/layout.tsx) header weight
4. Rework [StockAdjustment.tsx](/c:/Users/X/Desktop/lavanda/apps/web/src/components/inventory/StockAdjustment.tsx) into clearer modes
5. Create shared card/form patterns for inventory pages

## Definition Of Done For Future UI Work

A page is not “done” unless:

- it matches the system colors and accents
- it uses the defined radius and spacing rhythm
- it works in both English and Arabic
- its primary action is immediately obvious
- it does not feel like a default admin template
- it does not introduce new visual rules that only exist on that page

## Short Version

Lavanda POS should feel like a premium pharmacy operations console:

- warm, trustworthy login
- dark, focused shell
- quiet data surfaces
- green for action
- gold for brand
- no purple drift
- no generic admin clutter
- no localization sloppiness

That is the whole game.
