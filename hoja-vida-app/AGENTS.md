# SIGEHV · Fábrica de software (instrucciones para agentes de IA)

Este repositorio es el **frontend** del Sistema de Gestión de Hojas de Vida (SIGEHV) de UNIMINUTO,
basado en el **Formato Único de Hoja de Vida – Persona Natural** (Función Pública, Ley 190 de 1995,
Leyes 489 y 443 de 1998). Lo leen Google Antigravity, Claude, Copilot y cualquier agente compatible
con `AGENTS.md`. Las reglas detalladas por rol están en `.agents/rules/` y los flujos de trabajo
reutilizables en `.agents/skills/`.

## Stack
- Angular 20 (componentes **standalone**, TypeScript estricto, signals, control flow `@if/@for`).
- Angular Material + CDK con tema propio (azul `#0B2D6B`, dorado `#F2B705`) en `src/styles/`.
- SweetAlert2 para TODA confirmación o mensaje de acción, vía `core/services/alert.service.ts`.
- Reactive Forms tipados; la estructura del formulario vive en `features/hoja-vida/services/hoja-vida-form.factory.ts`.
- Backend: API REST FastAPI (Python). Mientras no exista, `core/mock/mock-backend.interceptor.ts` la simula.
  El contrato está en `docs/API_CONTRACT.md` y es la fuente de verdad.

## Comandos
- `npm start` → servidor de desarrollo en http://localhost:4200
- `npx ng build` → compilación de producción (debe terminar SIN errores antes de entregar)
- Usuarios demo: `demo@uniminuto.edu.co / Demo1234` y `admin@uniminuto.edu.co / Admin1234`

## Arquitectura (no romperla)
```
src/app/core      singleton: modelos, constantes, servicios, interceptores, guards, utils, mock
src/app/shared    componentes, pipes y directivas reutilizables (sin lógica de negocio)
src/app/layout    layouts principal y de autenticación
src/app/features  auth · dashboard · hoja-vida · perfil · admin (todas con lazy loading)
```

## Reglas no negociables
1. Español en la interfaz, mensajes y comentarios. Nombres de código en español (camelCase).
2. Ningún catálogo se escribe directo en el HTML: va en `core/constants/` y se expone por un servicio.
3. camelCase en el frontend, snake_case en la API; la conversión ocurre SOLO en los servicios (`case-mapper.ts`).
4. Toda acción destructiva o de guardado pide confirmación con `AlertService`.
5. Seguridad primero: lee `.agents/rules/05-seguridad.md` antes de tocar autenticación, archivos, IA o administración.
6. Cualquier cambio de API se refleja a la vez en `docs/API_CONTRACT.md`, en el servicio y en el mock.
7. No usar logos oficiales reales en el código: el logo lo carga el administrador.
8. Antes de terminar: `npx ng build` sin errores y prueba manual o E2E del flujo afectado.
