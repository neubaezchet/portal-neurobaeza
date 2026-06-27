# Neurobaeza Design System

The **Indigo 2026** design system (formerly "Obsidian"), extracted from the Portal Neurobaeza codebase — a Spanish‑language enterprise SaaS for medical disability ("incapacidades") validation, used by HR / Talento Humano, SST (occupational safety), Nómina (payroll) and validation teams in Colombian companies.

> **Current direction — Linear Indigo, light theme.** White backgrounds, indigo `#4F46E5` primary with a violet `#7C3AED` accent, oversized rounded corners (20/28/36 px), Plus Jakarta Sans body with Outfit display, soft glass panels. Enterprise but modern/young — a "Linear / Vercel / Notion" feel. (The original dark "Obsidian" sapphire direction is preserved in git history and the `--sapphire-*` token aliases.)

---

## Source

This system was built from a single attached codebase:

- `portal-neurobaeza/` — React 18 + Tailwind 3 SPA (CRA). Stack: `lucide-react`, `pdf-lib`, `pdf.js`, `@tanstack/react-query`, `xlsx`, `jszip`. Vanta.js `FOG` is used for the animated login background. The app talks to a Railway-hosted FastAPI backend.

No Figma, slide template, brand book or extra design files were provided. Iconography, type scale, color tokens and component patterns are reverse-engineered from `tailwind.config.js`, `src/index.css`, `src/App.jsx` and the `src/components/` tree.

---

## Index — what's in this folder

| File / Folder | What it contains |
| --- | --- |
| `README.md` | this file — context, content & visual fundamentals, iconography |
| `SKILL.md` | Agent-skill manifest for using this system in Claude Code |
| `colors_and_type.css` | All design tokens as CSS custom properties + semantic typography roles. **Palette: Linear Indigo, light theme.** |
| `components/` | Importable React components. `Button.jsx` + `Button.d.ts` — exposed on `window.NeurobaezaDesignSystem_a0fa6a.Button`. |
| `assets/` | Logos, illustrations, icon references |
| `preview/` | One small HTML card per token cluster — what powers the Design System tab |
| `ui_kits/portal/` | High-fidelity recreation of the Portal Validador app (login, dashboard, validation table, document viewer modal, reports) — now in **Indigo + white** |

Open `ui_kits/portal/index.html` to see the system in motion.

---

## Product context

**Portal Neurobaeza** (a.k.a. *IncaNeurobaeza*, *Portal de Validadores*) is the internal validation workbench used to review and process medical disability claims uploaded by employees of multiple Colombian companies. Validators triage scanned PDFs (epicrisis, EPS certificates, SOAT, registro civil, …), classify each case (`NUEVO`, `INCOMPLETA`, `ILEGIBLE`, `EPS_TRANSCRIPCION`, `DERIVADO_TTHH` / "posible fraude", `COMPLETA`, …), edit and re‑save the PDFs in Drive, and trigger automated WhatsApp + email notifications back to the employee.

Surfaces represented in the codebase:

1. **Login** — `LoginPage.jsx`. Vanta.js `FOG` animated background, sapphire glass card, ¿olvidaste tu contraseña? flow.
2. **App shell** — `App.jsx`. Top header (`bg-gradient-to-r from-blue-600 to-purple-600`), permission-filtered tab bar, role badge.
3. **Validación de Casos tab** — KPI stat grid, filters row, paginated table of cases with sapphire pill action button → opens the full-screen Document Viewer modal with PDF.js, page thumbnails, rotation, action menu (Completa / Incompleta / Ilegible / Posible fraude / Extra).
4. **Reportes y Tablas Vivas** — `Dashboard/ReportsDashboard.jsx`. Sub‑tabs (Resumen / Talento Humano / SST / Nómina / Indicadores), KPI cards, sortable searchable tables with Excel export.
5. **Power BI / Exportaciones / Pendientes / Plano** — sibling dashboards reusing the same chrome.
6. **180-day alerts** — `EmailConfig180.jsx` — recurring email config for cases ≥ 180 days.

The product is **dark‑mode only**. There is no light variant in the codebase.

---

## CONTENT FUNDAMENTALS

### Language

- **Spanish (Colombia)**, with date formatting `es-CO`. All UI copy, error messages, button labels, modal titles are Spanish. Examples from the code: *"Iniciar Sesión"*, *"Ver Documento"*, *"Confirmar Incompleta"*, *"Selecciona páginas primero"*, *"¿Estás 100% seguro?"*.
- Spanish accents are used correctly (validación, próximo, días, contraseña).
- A few well-known English terms stay English: *Excel*, *Power BI*, *Drive*, *Dashboard*, *Login*.

### Person & voice

- The user is addressed informally — **tú**, not usted. *"¿Olvidaste tu contraseña?"*, *"Ingresa tu correo"*, *"¿Estás seguro?"*. This is rare in Colombian enterprise software and is part of the brand's friendly-but-precise feel.
- The system speaks in the **first person plural** when promising work: *"Te enviaremos un enlace para restablecer"*.
- Validator-facing copy is **terse and imperative**: *"Selecciona páginas primero"*, *"Aplicando cambios…"*.

### Tone

- **Operational + reassuring**. Status changes are confirmed loudly with success notifications, destructive actions are framed in red with explicit caveats (*"Esta acción NO se puede deshacer"*).
- **Mild humor / warmth** in placeholder examples: *"Hola María, nos falta el registro civil del bebé, si puedes enviarlo hoy sería genial"*. The product is meant to feel like a calm colleague.
- **No marketing fluff.** This is back-office tooling — no "Empower your team", no "Revolutionize". Just nouns and verbs.

### Casing

- **UI labels:** Title Case in Spanish (*Validación de Casos*, *Exportar Excel*).
- **Status badges in tables:** ALL CAPS (`NUEVO`, `INCOMPLETA`, `COMPLETA`, `VALIDADA`, `ES POSIBLE FRAUDE`).
- **Eyebrow / meta labels** above KPIs: ALL CAPS + wide letter-spacing.
- **Column headers in data tables:** ALL CAPS short codes (*LLAVE*, *CÉDULA*, *F. INICIO*, *DÍAS INC.*).
- **Body text:** sentence case.

### Emoji use — heavy and structural

Emoji are not decorative — they are **semantic markers** baked into the product. Every action, status, modal and toast gets a leading emoji. This is so consistent it is effectively part of the type system:

| Domain | Emoji vocabulary |
| --- | --- |
| Status / outcome | ✅ success · ❌ fail · ⚠️ warning · 🔒 blocked · 🔓 unblocked · 🚨 fraud |
| Channels | 📧 email · 📱 WhatsApp · 💾 Drive · 📄 PDF · 📋 list / form |
| Tabs | 📊 Reportes · 👔 Talento Humano · 🛡️ SST · 💰 Nómina · 📈 Indicadores · 🤖 IA · 🧹 Limpiar |
| Roles | 🔑 Super Admin · 🛡️ Admin · 👥 TH · 🦺 SST · 💰 Nómina · 👁️ Viewer |
| Document types | 🤰 Maternidad · 🚑 Accidente · 🏥 EPS |

In any new screen, emoji **must** appear in tab labels, modal titles, and toast notifications. Never in headlines or in form labels.

### Specific copy examples to preserve

> ✅ Caso VALIDADO como COMPLETO — Avanzando…
> 🔒 Caso bloqueado — el empleado no puede subir más incapacidades
> 🚨 Posible Fraude — Seleccione la acción a realizar
> 📧 Email → carolina@empresa.com
> ⏳ Limpiando…
> ❌ Error de conexión

---

## VISUAL FOUNDATIONS

### Colors

- **Background:** stacked obsidian scale `#050507` → `#0B0B10` → `#12121A` → `#1A1A24`. The base page is the darkest; cards and panels are *slightly* lighter, glass panels add 75 % opacity + 40 px blur on top.
- **Brand primary:** **Sapphire 500** `#0EA5E9` (logo lockup, primary buttons, focus rings, links, "selected tab" underline). Hover goes darker to `#0284C7`.
- **Brand secondary:** **Champagne** `#F59E0B` — used sparingly: serial numbers in tables (`text-yellow-300`/champagne-400), warning badges. Provides warm counterpoint to the cool sapphire.
- **Semantic colors are loud:** success green `#10B981`, danger red `#EF4444`, warning amber `#F59E0B`, info blue `#3B82F6`. Status badges use `bg-{color}/20` + `text-{color}-400` — i.e. *transparent tinted background with a bright matching foreground*. This is the dominant badge pattern.
- **Fraud confirmed** gets its own near-black-red `#7F1D1D` ("ADULTERADA") — escalation beyond regular danger.
- **No bluish-purple gradients on cards.** The only purple gradient is the very top app header (`from-blue-600 to-purple-600`). Everything else inside the app is monochrome obsidian + sapphire.

### Typography

- **Body:** Plus Jakarta Sans (weights 300–800 + 400 italic). Default 15 px / 24 px.
- **Display / headings:** Outfit (300–800). Tight letter-spacing `-0.02em`. Headings are display, body is sans — never mixed within a heading.
- **Mono:** SF Mono → JetBrains Mono fallback. Used for serial numbers (`UPPERCASE` + champagne-400), code, table key columns.
- **Number style:** in KPI cards numbers are `font-black` (900) and very large; the supporting label above is `text-[10px]` ALL CAPS with wide tracking — strong hierarchy contrast.

### Spacing & layout

- **4 px base grid.** Most paddings are `p-4` (16 px), `p-6` (24 px) on glass panels, `p-8` (32 px) inside modals.
- **Generous corner radii:** `rounded-xl` (12 px) for tables and small cards; `rounded-2026` (20 px) for inputs and primary buttons; `rounded-2026-lg` (28 px) for the login card and modals; `rounded-2026-xl` (36 px) reserved for hero / large panels. Rounding is a recognisable brand signal — never use 4 / 6 / 8 px corners.
- **Page width:** `max-w-7xl` mx auto. The app does not stretch to full viewport on desktop.

### Backgrounds

- **Page:** flat obsidian, no gradient.
- **App header band:** the only place a `from-blue-600 to-purple-600` gradient appears. It's a horizontal sweep on a 2xl rounded card sitting at the top of the main content.
- **Login screen:** Vanta.js `FOG` particle simulation (sapphire highlight on obsidian midtones, blur factor 0.9, speed 2.5). Animated, mouse-reactive.
- **Glass panels:** the signature surface. `rgba(11,11,16,0.75)` + 40 px backdrop-blur, 1 px white-08 border, deep `0 16px 48px` outer shadow plus an inset `rgba(255,255,255,0.05)` top highlight. Every glass panel also has a `::before` pseudo-element rendering a **single 1 px horizontal gradient line** at the top — `linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)` — like the top edge of a piece of polished glass catching light.

### Animation

- **Primary easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (a snappy ease-out). Used on everything that fades or moves.
- **Standard fade-up entry:** `translateY(24px) → 0`, opacity 0 → 1, duration 600 ms. Applied to modals, cards on mount, success toasts.
- **Sapphire pulse:** a 3 s loop on focused / active CTAs — `box-shadow` blooms from 0 to 24 px with 25 % opacity sapphire. Used on the "Validar" CTA when a case is staged.
- **Shimmer:** for skeleton loaders, a 2.5 s linear gradient sweep.
- **No bouncy springs, no overshoot.** This is enterprise software — motion is deliberate, never playful.

### Hover & press states

- **Hover:** primary buttons darken one shade (sapphire-500 → sapphire-600) **and** the glow shadow intensifies (`rgba(14,165,233,0.3)` → `0.5`). Ghost buttons get `bg-white/5 → bg-white/10`. Table rows get `bg-gray-700/50`. Links go from slate-400 to white.
- **Press / active:** `transform: scale(0.98)` for action-style cards/buttons; primary buttons rely on color change only.
- **Focus visible:** 2 px sapphire outline + 2 px offset. Inputs get a `ring-2 ring-blue-500` and the border switches to sapphire.

### Borders

- **Cards:** `1px solid rgba(255,255,255,0.08)`. Never solid colors.
- **Inputs:** `1px solid rgba(255,255,255,0.08)`; focus pushes to sapphire 500. On dashboards the older surface uses `border-gray-700`.
- **Section dividers:** `border-t border-gray-700` between table header/body and footer.
- **No double borders, no dashed borders** except on the file-upload drop zone (`border-2 dashed`).

### Shadows / elevation

Three-tier system, all dark-on-dark:

- `shadow-glass-sm` — `0 4px 20px rgba(0,0,0,0.3)` + inset top highlight 10 %
- `shadow-glass-md` — `0 8px 32px rgba(0,0,0,0.4)` + inset 8 %
- `shadow-glass-lg` — `0 16px 48px rgba(0,0,0,0.5)` + inset 5 %

Plus two **glow** shadows reserved for sapphire-branded CTAs: `0 0 24px rgba(14,165,233,0.35)` and the hover-amplified `0 0 32px rgba(14,165,233,0.55)`.

### Transparency & blur

- Used **everywhere**. Almost no surface is fully opaque. The hierarchy comes from how blurred the panel is and how dark its base layer is, not from solid color fills.
- Backdrop-blur is `30 px` on dropdowns and `40 px` on the main glass panels.
- Overlays for modals: `bg-black/70` to `bg-black/80 backdrop-blur` — heavy.

### Layout rules

- App is **fixed within `max-w-7xl`** (≈1280 px). It does not span full viewport on widescreens.
- Header is a **sticky horizontal gradient card** sitting *inside* the page padding, not bleeding to edges.
- Tab bar is a flat row with **2 px bottom border** in `border-gray-700`; active tab gets a sapphire bottom border + matching text color.
- Modals are full-screen overlay + centered `max-w-2xl` glass card.
- Tables are full-width inside their container, never paginated client-side — server paginates.

### Imagery vibe

- Cool, blue-leaning. The only "image" in the entire codebase is the Vanta FOG canvas on the login screen — a slow blue-on-black animated cloud.
- No photography in the product. If imagery is added it should be **monochrome, cool-toned, subtle**.
- Avatars use initial + sapphire glow.

### Card pattern

- Outer shape: rounded-2026 (20 px), 1 px white/08 border, glass background, `shadow-glass-md`.
- Top inset highlight line is non-negotiable — it's the "polished glass edge".
- Inside: 16–24 px padding, content stacks vertically with `gap-3` (12 px).
- KPI cards add a soft per-color gradient (`from-{color}-600/20 to-{color}-800/20` with `border-{color}-500/30`) — the only place colored card surfaces appear.

---

## ICONOGRAPHY

The product uses **two parallel icon systems**, both deliberate.

### 1. Lucide React (primary UI icons)

`lucide-react@0.545.0` is the sole icon library. Every chrome icon — `User`, `CheckCircle`, `XCircle`, `FileText`, `Send`, `Edit3`, `Clock`, `ChevronLeft/Right/Down`, `X`, `Download`, `RefreshCw`, `AlertCircle`, `ZoomIn/Out`, `Sliders`, `Undo2`, `Image`, `Loader2`, `Check`, `Save`, `LogOut`, `Lock`, `Mail`, `Eye`, `EyeOff`, `ArrowLeft`, `Search`, `TrendingUp`, `BarChart3`, `Pause`, `Play`, `ArrowUpDown`, `ExternalLink` — comes from Lucide.

**Usage rules:**
- Default stroke width **2** (Lucide default).
- Default size: `w-4 h-4` (16 px) inline with text, `w-5 h-5` (20 px) in buttons, `w-6 h-6` (24 px) in modal headers, `w-8 h-8` (32 px) on the login lock badge.
- Color always inherits from `currentColor` — never set fill, only the text color of the wrapping element.
- Used **alongside** an emoji marker, not instead of. e.g. `<CheckCircle />` for the affordance + `✅` for semantic emphasis in the label.

This system is loaded from CDN in the UI kit via Lucide's `<script src="https://unpkg.com/lucide@latest"></script>` icon font. **No substitutions were necessary.**

### 2. Emoji (semantic / status / domain markers)

Documented in *Content Fundamentals* above. Emoji are part of the type system — strip them out and the product reads as cold and generic. They are inline Unicode (no Twemoji, no custom emoji set), rendered using whatever the OS provides. This is intentional: it makes status read at a glance with zero icon-design cost.

**Emoji rules:**
- Always **leading** the label, separated by a single space.
- Only one emoji per label, max two if combining domain + status (e.g. `📧 ✅`).
- Never inside form input placeholders, never inside body paragraphs.
- Never used to *decorate* — only to *classify*.

### Logos / brand marks

The codebase contains **no rasterised logo file**. The brand identity on the login page is constructed at runtime as a sapphire-glow rounded square containing the Lucide `Lock` icon, with the wordmark "Portal Incapacidades" set in Outfit semibold below.

We have re-created this lockup as `assets/neurobaeza-logo.svg` and `assets/neurobaeza-mark.svg`. **Flagged for the user**: if the company has an official logotype it should replace these.

### Unicode characters as UI

Used occasionally — `→`, `•`, `·` and `—` (em dash) appear in toast messages and microcopy (*"📧 Email → carolina@empresa.com"*). The em dash is the preferred separator for clauses (not parentheses).

---

## Notes & caveats

- **Font substitutions:** none needed — Plus Jakarta Sans, Outfit and JetBrains Mono are all available on Google Fonts (already used by the source).
- **Logo:** synthesised from the Lock-icon-in-rounded-square pattern observed in `LoginPage.jsx`. Please send an official wordmark / logotype if one exists.
- **Vanta FOG background:** kept on the login page recreation only. Outside login it's not used.
- **Spanish-only copy** — none of the source files contain English UI strings beyond inline JavaScript identifiers.
- **No print styles** in the source — all PDF output is generated server-side via `pdf-lib`.
