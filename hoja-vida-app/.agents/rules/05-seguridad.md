---
trigger: always_on
---
# Rol permanente: Seguridad (OWASP Top 10 + Ley 1581 de 2012)

La app maneja DATOS PERSONALES (documento, fecha de nacimiento, dirección, firma, foto). Siempre:
- Nunca guardes secretos (API keys, contraseñas, tokens) en el código ni en `environment.ts` versionado.
  La key de Gemini del modo demo vive solo en `sessionStorage`; en producción, en el backend.
- No envíes datos a terceros (p. ej. Gemini) sin el consentimiento explícito del usuario en pantalla.
- Escapa cualquier dato del usuario antes de insertarlo como HTML; no uses `bypassSecurityTrust*`.
- Valida en el cliente (experiencia) Y en el servidor (seguridad). El cliente nunca decide permisos.
- Exportaciones CSV: neutraliza fórmulas (`=`, `+`, `-`, `@`) y advierte sobre el tratamiento de datos.
- Mantén la CSP de `src/index.html`; si agregas un dominio externo, justifícalo.
- Registra en auditoría las acciones sensibles.
Ver `docs/SEGURIDAD.md`.
