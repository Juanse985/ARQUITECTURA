# Seguridad de SIGEHV

La aplicación maneja **datos personales** (Ley 1581 de 2012): documento de identidad, fecha y lugar de
nacimiento, dirección, teléfono, firma y foto. Este documento resume los controles implementados en el
frontend y en el backend simulado, y lo que **debe** implementar la API FastAPI en producción.

## Controles implementados (frontend + backend simulado)

| Riesgo (OWASP Top 10 2021) | Control | Dónde |
|---|---|---|
| A01 Control de acceso | `authGuard` y `adminGuard` en rutas; la API vuelve a validar el rol consultando la base (no el token) y la propiedad de cada hoja de vida (403 si es de otro usuario). El admin no puede quitarse su propio rol ni desactivarse. | `core/guards/auth.guard.ts`, `core/mock/mock-backend.interceptor.ts` |
| A02 Fallas criptográficas | Contraseñas con hash SHA-256 + salt por usuario (demo). Nunca se guardan en claro. JWT con expiración (2 h). | mock (`sha256`, `nuevoSalt`) |
| A03 Inyección / XSS | Angular escapa las plantillas; los mensajes SweetAlert con datos del usuario pasan por `escaparHtml`; sin `innerHTML` ni `bypassSecurityTrust`. Exportación CSV con neutralización de fórmulas (`=`, `+`, `-`, `@`). Texto devuelto por la IA se limpia (`<`, `>`) y se valida contra catálogos. | `alert.service.ts`, `error.interceptor.ts`, `admin-hojas-vida.component.ts`, `gemini.service.ts` |
| A04 Diseño inseguro | Consentimiento explícito antes de enviar la HV a Gemini; el usuario revisa antes de aplicar. El listado del admin muestra datos mínimos. Advertencia al exportar datos personales. | `importar-hoja-vida.component.*` |
| A05 Configuración | Política CSP en `index.html` (scripts propios, conexiones solo a la API y a Gemini, `object-src 'none'`). `referrer` estricto. Analítica del CLI desactivada. | `src/index.html`, `angular.json` |
| A07 Autenticación | Contraseña ≥ 8 caracteres con mayúscula y número; bloqueo de 5 minutos tras 5 intentos fallidos; mensaje genérico en login (no revela si el correo existe); cierre de sesión al expirar el token y **por inactividad (15 min)**. | `custom-validators.ts`, mock, `inactividad.service.ts`, `auth.service.ts` |
| A08 Integridad de archivos | Validación del **tipo real** por firma de bytes (PDF, DOCX/ZIP, PNG, JPG), tamaño máx. 5 MB (HV) y 500 KB (logo). SVG no se admite (puede contener scripts). | mock `detectarFormato`, `admin-configuracion.component.ts` |
| A09 Registro y monitoreo | Bitácora de auditoría: login ok/fallo, registro, cambio de contraseña, accesos denegados, consultas y listados de HV por el admin, cambios de rol, sedes, configuración y cargas de archivos. | Administración → Auditoría |

## API key de Gemini (importante)

**Modo demostración (actual):** el navegador llama directamente a `generativelanguage.googleapis.com`.
- La key NO está en el código: se pide en pantalla y se guarda en `sessionStorage` (se borra al cerrar la pestaña).
- Se envía en el encabezado `x-goog-api-key`, nunca en la URL.
- El token JWT de la app **no** se envía a Google (el `authInterceptor` solo actúa sobre `apiUrl`).
- Riesgo residual: quien use el equipo durante la sesión puede ver la key en las herramientas del navegador.
  Use una key de prueba con cuota limitada y restrínjala por dominio en Google AI Studio / Cloud Console.

**Producción (obligatorio):** mover la llamada al backend:
```
POST /api/ia/extraer-hoja-vida   (multipart: archivo)   →   mismo JSON normalizado
```
con `GEMINI_API_KEY` en variables de entorno del servidor, límite de peticiones por usuario y registro en auditoría.

## Lo que DEBE hacer el backend FastAPI

1. **Contraseñas:** Argon2id (`argon2-cffi`) o bcrypt; nunca SHA-256 simple.
2. **JWT:** firmado con secreto fuerte (`SECRET_KEY` en `.env`), `exp` corto, claims `sub` y `rol`; considerar refresh token en cookie `HttpOnly; Secure; SameSite=Strict`.
3. **Autorización:** dependencias `usuario_actual` y `solo_admin`; filtrar SIEMPRE por `usuario_id` en las consultas de hoja de vida.
4. **Validación:** modelos Pydantic con longitudes máximas, enumeraciones y fechas; rechazar campos extra (`extra="forbid"`).
5. **Archivos:** validar firma de bytes (`python-magic`), máximo 5 MB, nombre aleatorio (UUID), almacenamiento fuera de la carpeta pública, antivirus si es posible, servir con `Content-Disposition: attachment`.
6. **Limitación de tasa:** `slowapi` en `/auth/login`, `/auth/register` y `/ia/*`.
7. **CORS** solo para el dominio del frontend; **HTTPS** obligatorio; encabezados `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, `X-Frame-Options: DENY`.
8. **Auditoría** persistente (tabla `auditoria`) y retención definida.
9. **Datos personales (Ley 1581):** aviso de privacidad, finalidad, derecho de acceso/rectificación/supresión (el usuario ya puede eliminar su HV), cifrado en reposo de la base y copias de seguridad.
10. **Dependencias:** `pip-audit` y `npm audit` en cada entrega.
