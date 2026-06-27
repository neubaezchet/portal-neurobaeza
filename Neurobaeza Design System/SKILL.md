---
name: neurobaeza-design
description: Use this skill to generate well-branded interfaces and assets for Neurobaeza (Portal Neurobaeza / IncaNeurobaeza — Spanish enterprise medical disability validation SaaS), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping in the "Indigo 2026" Linear-style light theme.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

**Quick orientation**

- `colors_and_type.css` — paste-in stylesheet with every design token as a CSS custom property + ready-made semantic typography roles (`h1`–`h4`, `.body`, `.label`, `.serial`, `.glass-panel-2026`, `.gradient-text-sapphire`).
- `components/` — importable React components (`Button`). Mount via `const { Button } = window.NeurobaezaDesignSystem_a0fa6a`.
- `assets/` — logos (SVG), iconography references.
- `ui_kits/portal/` — high-fidelity recreation of the Portal Validador app. Lift components from here.
- `preview/` — small specimen cards illustrating each token cluster.

**Hard rules for this brand**

1. Light theme. Page background is `#FFFFFF`; sections `#F8FAFC`; text `#0F172A` on white.
2. All copy is **Spanish (Colombia)** — informal **tú**, sentence case, emoji-as-semantic-marker (native OS Unicode; brand SVG for Drive/WhatsApp/PDF).
3. Primary action color is **Indigo #4F46E5** with a violet `#7C3AED` accent and an indigo glow on hover.
4. Corner radii live on a 20 / 28 / 36 px scale — never 4 / 6 / 8.
5. Every "card" surface is a light glass panel: 85 % white + 24 px backdrop blur + 1 px slate/08 border + an inset top highlight line. The app header is the one dark surface (indigo→violet gradient, white text).
6. Headings use **Outfit**, body uses **Plus Jakarta Sans**, mono uses **JetBrains Mono**.
7. Icons come from **Lucide** (stroke width 2) — emoji are the semantic layer on top, never decoration.
