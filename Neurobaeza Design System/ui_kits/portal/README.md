# Portal Neurobaeza — UI Kit

High-fidelity, click-through recreation of the **Portal de Validadores** app, built directly from the codebase at `portal-neurobaeza/`. Run `index.html` in a browser.

## Screens included

| Screen | File | Notes |
| --- | --- | --- |
| 🔐 Login | `LoginScreen.jsx` | Vanta-FOG-style animated obsidian background (CSS-approximated), sapphire glass card |
| 🏠 App shell | `AppShell.jsx` | Gradient header + permission-filtered tab bar + role badge |
| ✅ Validación de Casos | `ValidacionTab.jsx` | KPI stat row + filters + paginated case table |
| 📄 Document Viewer | `DocumentViewerModal.jsx` | Full-screen modal with PDF placeholder, page thumbnails, action panel |
| 📊 Reportes | `ReportesTab.jsx` | KPI cards + sortable table with Excel export |

## Components

`components.jsx` ships the atoms reused across screens: `Button`, `GhostButton`, `IconButton`, `StatusBadge`, `KPICard`, `GlassPanel`, `Toast`, `Eyebrow`, `Serial`, `Tab`.

## Conventions

- Icons come from **Lucide** loaded via CDN (`<script src="https://unpkg.com/lucide@latest">`). The kit calls `lucide.createIcons()` after each render to swap `<i data-lucide="…">` placeholders.
- All copy is **Spanish (Colombia)** — see the brand README for tone & emoji rules.
- Mock data lives in `data.js`. There is no real backend; the document viewer accepts any "validar" action and shows a toast.

## What's purposely incomplete

- The PDF viewer renders a placeholder page (not real PDF.js). The rotation / zoom / pages logic is wired to local state for the demo.
- The fraud & extra modals from the original app are simplified to single confirm steps.
- The `180 días` alert config and Power BI / Plano Incapacidades dashboards are not implemented.
