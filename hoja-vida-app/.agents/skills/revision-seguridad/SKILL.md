---
name: revision-seguridad
description: Revisión de seguridad (OWASP Top 10 y Ley 1581) de un cambio o de todo el proyecto SIGEHV.
---
# Flujo: revisión de seguridad

Revisa y reporta (archivo:línea → riesgo → corrección):
1. **Control de acceso (A01)**: rutas con `authGuard`/`adminGuard`; en API, rol consultado en BD y propiedad del recurso.
2. **Fallas criptográficas (A02)**: sin secretos en el repo (`git grep -n "AIza\|password\s*="`); HTTPS en producción.
3. **Inyección/XSS (A03)**: búsqueda de `innerHTML`, `bypassSecurityTrust`, `html:` en SweetAlert sin `escaparHtml`; CSV con fórmulas neutralizadas.
4. **Diseño inseguro (A04)**: consentimiento antes de enviar datos a IA; datos mínimos en listados del admin.
5. **Configuración (A05)**: CSP en `index.html`, CORS restringido en FastAPI, `useMock=false` en producción.
6. **Componentes vulnerables (A06)**: `npm audit --omit=dev` y revisar severidad alta/crítica.
7. **Autenticación (A07)**: política de contraseñas, bloqueo tras 5 intentos, expiración de JWT, cierre por inactividad.
8. **Integridad (A08)**: validar firma de bytes de archivos subidos; no aceptar SVG.
9. **Registro y monitoreo (A09)**: auditoría de login, cambios de rol, consultas y exportaciones.
10. **SSRF (A10)**: el backend solo llama a dominios permitidos (Gemini).
Entrega un resumen con severidad (alta/media/baja) y PR sugerido.
