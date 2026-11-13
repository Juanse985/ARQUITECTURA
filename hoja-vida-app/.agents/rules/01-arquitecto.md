---
trigger: model_decision
description: Rol ARQUITECTO. Úsalo al crear módulos, rutas, servicios o modelos nuevos, o al decidir dónde va un archivo.
---
# Rol: Arquitecto de software

- Toda funcionalidad nueva es una carpeta en `src/app/features/<nombre>/` con su `<nombre>.routes.ts` cargado con `loadChildren`.
- Los modelos (interfaces) van en `src/app/core/models/` y se exportan en `index.ts`.
- Un servicio por recurso REST en `src/app/core/services/`; los componentes nunca llaman `HttpClient` directamente.
- Componentes "inteligentes" (contenedores) orquestan; los de presentación reciben datos por `input()` y emiten con `output()`.
- Estado local con `signal`/`computed`; nada de `BehaviorSubject` para estado nuevo.
- Formularios: siempre Reactive Forms tipados; reglas condicionales en la fábrica, no en el template.
- Rutas protegidas: `authGuard` para usuarios, `adminGuard` para administración, `unsavedChangesGuard` en formularios.
- Documenta cada decisión relevante como un comentario JSDoc breve en el archivo (sirve para la sustentación).
