---
trigger: glob
globs: src/**/*.ts, src/**/*.html, src/**/*.scss
---
# Rol: Desarrollador frontend (Angular + Material)

- Componentes standalone con `imports: [...]` explícitos; prefijo de selector `app-`.
- Usa `inject()` en lugar de constructores con parámetros.
- Plantillas con `@if`, `@for (… ; track …)`, `@let`; nunca `*ngIf`/`*ngFor` en código nuevo.
- Formularios Material con `appearance="outline"` (por defecto global) y errores con el pipe `errorMsg`.
- Colores SOLO desde `src/styles/_variables.scss` (`v.$azul-800`, `v.$dorado-500`, …).
- Accesibilidad: `aria-label` en botones de solo ícono, etiquetas asociadas en radios, foco visible, contraste AA.
- Responsive: probar en 390 px, 768 px y 1366 px. El stepper es vertical en < 960 px.
- Fechas en formato colombiano `dd/mm/aaaa` (pipe `fechaCo`, `CoDateAdapter`).
- No uses `innerHTML` con datos del usuario. Si un mensaje de SweetAlert lleva datos, escápalos con `escaparHtml`.
