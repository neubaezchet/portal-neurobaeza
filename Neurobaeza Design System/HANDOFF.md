# HANDOFF — Aplicar el Neurobaeza Design System al código real

> Para **Claude Code** (o cualquier dev). Objetivo: migrar `portal-neurobaeza/` (el frontend React real) a la nueva paleta **Linear Indigo · tema claro**. **Solo estilos. No tocar lógica, llamadas al backend, ni el flujo de validación.**

---

## 0. Reglas de oro

1. **Esto es solo frontend.** El backend (FastAPI en Railway) NO cambia.
2. **El `ui_kits/portal/` es una RECREACIÓN cosmética**, no el código real. Sirve como referencia visual. NO copies su lógica — tu código real ya tiene PDF.js, validaciones y API.
3. **Cambio grande:** el portal real hoy es **oscuro**; lo pasamos a **fondo blanco**. Habrá que cazar casos de `text-white` sobre fondo claro pantalla por pantalla.
4. **Muestra los cambios antes de aplicarlos.** Trabaja archivo por archivo y deja que el usuario revise.

---

## 1. Orden de trabajo

```
1. src/index.css              → reemplazar las CSS variables (tabla §2)
2. tailwind.config.js         → actualizar el theme.extend.colors (§3)
3. src/App.jsx                → header, tabs, botones (§4)
4. src/components/LoginPage.jsx
5. src/components/Dashboard/*.jsx
6. Barrido final: text-white / bg-gray-900 huérfanos (§5)
```

---

## 2. Mapeo de colores · viejo → nuevo

### Backgrounds (oscuro → claro)
| Viejo (Obsidian) | Nuevo (Light) | Uso |
| --- | --- | --- |
| `#050507` | `#FFFFFF` | fondo de página |
| `#0B0B10` | `#F8FAFC` | secciones / bandas |
| `#12121A` | `#FFFFFF` | superficie de card |
| `#1A1A24` | `#F1F5F9` | elevado / hover |

### Texto (claro → oscuro)
| Viejo | Nuevo | Uso |
| --- | --- | --- |
| `#F8FAFC` | `#0F172A` | texto primario |
| `#CBD5E1` | `#334155` | secundario |
| `#94A3B8` | `#64748B` | terciario |
| `#64748B` | `#94A3B8` | muted |
| `#475569` | `#CBD5E1` | disabled |

### Marca (Sapphire → Indigo + Violet)
| Viejo Sapphire | Nuevo Indigo | Uso |
| --- | --- | --- |
| `#0EA5E9` | `#4F46E5` | **primary action** |
| `#0284C7` | `#4338CA` | primary hover |
| `#0369A1` | `#3730A3` | primary deep |
| `#38BDF8` | `#818CF8` | accent claro |
| `#7DD3FC` | `#A5B4FC` | accent muy claro |
| accent 2º | `#7C3AED` / `#A78BFA` | **violet** (gradiente header) |
| data/info | `#06B6D4` / `#22D3EE` | **cyan** |

### Header (única superficie oscura que se conserva)
```
Viejo:  linear-gradient(90deg,  #2563EB 0%, #7C3AED 100%)
Nuevo:  linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #A78BFA 100%)
        → texto blanco sobre el header se mantiene
```

### Bordes
```
Viejo:  rgba(255,255,255, 0.08)   (white-α sobre oscuro)
Nuevo:  rgba(15,23,42, 0.08)      (slate-α sobre blanco)
```

> Los estados semánticos (success `#10B981`, danger `#EF4444`, warning `#F59E0B`) **no cambian de hue**, pero sus versiones *-400* claras que se usaban como texto deben ir a *-600/-700* para tener contraste sobre blanco. Ver `colors_and_type.css` del design system, sección "Text".

---

## 3. tailwind.config.js

Reemplaza el bloque de marca por:

```js
// theme.extend.colors
brand: {
  50:  '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
  300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1',
  600: '#4F46E5', // primary
  700: '#4338CA', 800: '#3730A3', 900: '#312E81',
},
violet: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED' },
cyan:   { 400: '#22D3EE', 500: '#06B6D4', 700: '#0E7490' },
```

Y cambia el default body en `index.css`:
```css
body { background: #FFFFFF; color: #0F172A; }  /* antes: #050507 / #F8FAFC */
```

---

## 4. Patrones de clases Tailwind a sustituir

| Buscar | Reemplazar |
| --- | --- |
| `bg-gray-900` / `bg-black` | `bg-white` |
| `bg-gray-800` | `bg-slate-50` |
| `bg-gray-700` (hover) | `bg-slate-100` |
| `text-white` (en body, NO en botones/header) | `text-slate-900` |
| `text-gray-300` | `text-slate-700` |
| `text-gray-400` | `text-slate-500` |
| `border-gray-700` | `border-slate-200` |
| `text-sky-400` / `text-blue-400` | `text-indigo-600` |
| `bg-sky-500` / `bg-blue-500` | `bg-indigo-600` |
| `ring-sky-500` / `ring-blue-500` | `ring-indigo-500` |
| `from-blue-600 to-purple-600` (header) | `from-indigo-600 via-violet-600 to-violet-400` |

> ⚠️ **NO** cambies `text-white` dentro de: botones primarios/success/danger, el header con gradiente, y los badges con fondo de color. Ahí el texto blanco es correcto.

---

## 5. Checklist de QA (pantalla por pantalla)

- [ ] **Login** — botón "Iniciar Sesión" indigo; ¿texto del título visible sobre la card blanca?
- [ ] **Header** — gradiente indigo→violeta, texto blanco, badge de rol legible
- [ ] **Tabs** — activo en indigo con borde inferior; inactivos en slate-500
- [ ] **KPI cards** — números oscuros (`#0F172A`) sobre los gradientes pastel
- [ ] **Tabla de casos** — filas legibles, badges de estado con contraste, hover slate-100
- [ ] **Document Viewer** — panel claro, nombre del paciente oscuro, PDF sigue blanco
- [ ] **Reportes** — tabla "en vivo", sub-tabs indigo
- [ ] **Toasts** — fondo claro tintado, texto oscuro
- [ ] Barrido global: buscar `text-white` y `bg-gray-9` huérfanos → revisar cada uno

---

## 6. Prompt sugerido para arrancar

> "Lee `neurobaeza-design-system/SKILL.md`, `colors_and_type.css` y este `HANDOFF.md`. Empieza por `portal-neurobaeza/src/index.css`: reemplaza las CSS variables de fondo y marca según la tabla §2. Muéstrame el diff antes de aplicar. No toques lógica ni llamadas a la API — solo estilos. Luego seguimos archivo por archivo según §1."

---

## 7. Tokens canónicos

La fuente de verdad de todos los valores es **`colors_and_type.css`** en la raíz del design system. Cópialo a `portal-neurobaeza/src/` o úsalo de referencia para tus variables. Contiene además:
- escala tipográfica (`--fs-*`, `--fw-*`, `--lh-*`)
- radios (`--r-2026` = 20px, etc.)
- sombras (`--shadow-glass-*`, `--shadow-glow-indigo`)
- motion (`--ease-2026`, `--dur-*`)
