---
name: nueva-funcionalidad
description: Flujo para agregar una funcionalidad completa (modelo, contrato, servicio, mock, UI, ruta, pruebas) en SIGEHV.
---
# Flujo: nueva funcionalidad

1. **Entender**: escribe en 3–5 líneas qué problema resuelve, para qué rol (usuario/admin) y qué datos usa.
2. **Contrato**: agrega o modifica los endpoints en `docs/API_CONTRACT.md` con ejemplos JSON (snake_case).
3. **Modelos**: interfaces en `src/app/core/models/` (+ export en `index.ts`).
4. **Servicio**: método en el servicio del recurso con `toSnakeCase`/`toCamelCase`.
5. **Mock**: implementa el endpoint en `core/mock/mock-backend.interceptor.ts` respetando permisos y auditoría.
6. **UI**: componente standalone en `features/<modulo>/`, ruta lazy, `PageTitleComponent`, breadcrumb (`data.breadcrumb`).
7. **Confirmaciones**: SweetAlert2 vía `AlertService` en guardar/eliminar.
8. **Seguridad**: aplica `.agents/rules/05-seguridad.md`.
9. **Verificar**: ejecuta el flujo `prueba-e2e` y `npx ng build`.
10. **Documentar**: README (si cambia el uso) y un comentario JSDoc con la decisión técnica.
