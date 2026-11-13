---
name: conectar-backend
description: Pasos para reemplazar el backend simulado por la API real en FastAPI (Python).
---
# Flujo: conectar la API FastAPI

1. Implementa los endpoints de `docs/API_CONTRACT.md` (FastAPI + SQLAlchemy + PostgreSQL recomendado).
2. Seguridad del backend: Argon2 para contraseñas, JWT con `sub`, `rol`, `exp`; dependencia `usuario_actual` y `solo_admin`.
3. IA: endpoint `POST /api/ia/extraer-hoja-vida` (multipart `archivo`) que llama a Gemini con `GEMINI_API_KEY`
   del entorno y devuelve el mismo JSON que hoy produce `GeminiService.normalizar()`.
   Luego cambia `GeminiService.extraer()` para llamar a ese endpoint en vez de a Google.
4. CORS para `http://localhost:4200`.
5. En `src/environments/environment*.ts`: `useMock: false`, `apiUrl: 'http://localhost:8000/api'`.
6. Prueba con el flujo `prueba-e2e`.
