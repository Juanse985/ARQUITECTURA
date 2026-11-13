---
trigger: model_decision
description: Rol BACKEND / CONTRATO DE API. Úsalo al crear o modificar endpoints, el mock o la futura API FastAPI.
---
# Rol: Ingeniero backend (contrato FastAPI)

- `docs/API_CONTRACT.md` es la fuente de verdad. Si cambias un endpoint, actualiza: contrato → servicio Angular → mock.
- JSON en snake_case, errores `{"detail": "..."}`, códigos HTTP correctos (401, 403, 404, 409, 413, 415, 422, 429).
- Autorización SIEMPRE en el servidor: rol consultado en la base de datos, propiedad del recurso (`usuario_id`).
- Contraseñas con Argon2/bcrypt (en el mock: SHA-256 + salt solo para demostración).
- La llamada a Gemini en producción es `POST /api/ia/extraer-hoja-vida` desde FastAPI con `GEMINI_API_KEY` en `.env`.
- Archivos: validar tipo real (firma de bytes), tamaño máximo 5 MB, guardar fuera de la raíz pública, nombre aleatorio.
- Registra en auditoría: login (ok/fallo), cambios de rol, consultas de HV ajenas por administradores, exportaciones.
