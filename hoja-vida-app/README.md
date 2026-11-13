# SIGEHV · Sistema de Gestión de Hojas de Vida

Frontend en **Angular 20 + Angular Material + SweetAlert2** para crear y administrar hojas de vida basadas en el
**Formato Único de Hoja de Vida – Persona Natural** (Función Pública, Ley 190 de 1995, Leyes 489 y 443 de 1998).

Proyecto académico · Ingeniería de Sistemas · UNIMINUTO. Listo para conectarse a una API REST en **Python (FastAPI)**.
Mientras no exista el backend, funciona con un **backend simulado** (mock) que guarda los datos en el navegador.

---

## 1. Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 20.19 o superior (recomendado 22 LTS) |
| npm | 10 o superior |
| Angular CLI | 20 (se usa vía `npx`, no hace falta instalarlo global) |

## 2. Ejecutar el proyecto (ya creado)

```bash
cd hoja-vida-app
npm install          # instala dependencias (solo la primera vez)
npm start            # ng serve -> http://localhost:4200
```

Usuarios de demostración (modo mock):

| Rol | Correo | Contraseña |
|---|---|---|
| Usuario | demo@uniminuto.edu.co | Demo1234 |
| Administrador | admin@uniminuto.edu.co | Admin1234 |

El backend simulado trae además ~180 hojas de vida **ficticias** repartidas en las sedes para que el panel
de administración muestre estadísticas. También puede registrar usuarios nuevos.

En VS Code: **Terminal → Run Task → "SIGEHV: instalar y ejecutar"** hace `npm install` y abre el navegador en http://localhost:4300.

Otros comandos:

```bash
npm run build        # compilación de producción en dist/hoja-vida-app/browser
npx ng build --configuration development
```

> Para reiniciar los datos de prueba, borre en el navegador (F12 → Application → Local Storage) las claves `sigehv_mock_db` y `sigehv_token`.

### Importar hojas de vida con IA (Gemini)

1. Cree una API key gratuita en **Google AI Studio** (https://aistudio.google.com/apikey).
2. En la app: **Importar HV con IA** → suba un PDF, Word (.docx), foto/escaneo (JPG/PNG) o TXT → autorice → **Analizar con IA**.
3. La primera vez la app pide la API key; se guarda solo en esa pestaña (sessionStorage).
4. Revise lo encontrado → **Aplicar al formulario y revisar** (solo campos vacíos o sobrescribir) → corrija y guarde.

El archivo original queda adjunto a la hoja de vida. **Modo demostración:** en producción la llamada a Gemini
debe hacerla el backend (ver `docs/SEGURIDAD.md`).

## 3. Cómo se creó (comandos de referencia)

```bash
npx @angular/cli@20 new hoja-vida-app --style=scss --routing --ssr=false --strict --skip-tests
cd hoja-vida-app
npm install @angular/material@20 @angular/cdk@20 @angular/animations@20   # equivale a ng add @angular/material
npm install sweetalert2
npm install material-icons @fontsource/montserrat @fontsource/roboto      # íconos y fuentes sin depender de internet
npx ng generate @angular/material:theme-color --primary-color=#0B2D6B --tertiary-color=#F2B705 --directory=src/styles/
```

## 4. Arquitectura

```
src/app/
  core/          singleton: modelos, constantes/catálogos, servicios, interceptores, guards, validadores, utils, mock
  shared/        componentes reutilizables (loader, breadcrumb, page-title, field-error, signature-pad, footer, logo), pipes, directivas
  layout/        main-layout (toolbar + sidenav + footer) y auth-layout
  features/
    auth/        login, registro, recuperar contraseña
    dashboard/   inicio con completitud por sección y accesos rápidos
    hoja-vida/   stepper de 7 pasos, detalle (CRUD), formato oficial imprimible
    perfil/      datos de la cuenta y cambio de contraseña
    admin/       panel, mapa, hojas de vida, usuarios, sedes, configuración y auditoría (rol ADMIN)
environments/    apiUrl y useMock
styles/          tema Material (azul/dorado), SweetAlert2, impresión
docs/API_CONTRACT.md   contrato de la API para FastAPI
docs/SEGURIDAD.md      controles de seguridad y requisitos del backend
AGENTS.md, .agents/    fábrica de software (reglas y flujos para agentes de IA)
```

### Decisiones técnicas (para la sustentación)

1. **Componentes standalone + lazy loading.** Cada feature se carga bajo demanda (`loadChildren`/`loadComponent`), por eso el bundle inicial es pequeño y no se necesitan `NgModule`.
2. **Separación presentación / lógica.** Los componentes solo muestran y capturan datos; la lógica HTTP vive en `AuthService`, `HojaVidaService` y `CatalogosService`; las reglas del formulario en `HojaVidaFormFactory`; el cálculo de experiencia en `ExperienciaCalculoService`.
3. **Un único formulario reactivo raíz** (`FormGroup` con un sub-grupo por paso y `FormArray` para estudios, idiomas y experiencias). Cada paso recibe su sub-grupo por `input()`, el stepper valida por paso (`stepControl`) y la vista previa lee todo el modelo. Formularios **fuertemente tipados** (los tipos se derivan de la fábrica).
4. **Reglas condicionales centralizadas:** libreta militar solo si sexo = M, país si es extranjero, fecha de terminación obligatoria si graduado = Sí, "Empleo actual" desactiva la fecha de retiro, validación de rangos y de **cruce de fechas** entre experiencias.
5. **Interceptores funcionales:** `loading` (spinner global), `auth` (Bearer JWT), `error` (SweetAlert2 centralizado; 401 cierra sesión) y `mockBackend`.
6. **Backend simulado como interceptor** (en lugar de json-server): la app hace peticiones HTTP *reales*; el mock responde exactamente con el contrato de FastAPI (snake_case, códigos de estado, JWT con `exp`). Para usar el backend real solo se cambia `useMock` y `apiUrl`.
7. **camelCase ⇄ snake_case** convertido en un solo lugar (`core/utils/case-mapper.ts`) dentro de los servicios.
8. **Guardado parcial:** al pulsar *Siguiente* se guarda un borrador (`PUT /hoja-vida/{id}`), con indicador de completitud por sección. `CanDeactivate` + SweetAlert2 avisa si hay cambios sin guardar (y `beforeunload` al cerrar la pestaña).
9. **Fechas colombianas** `dd/mm/aaaa` con un `DateAdapter` propio (`CoDateAdapter`) y `MAT_DATE_LOCALE = 'es-CO'`.
10. **Catálogos fuera del HTML:** todos en `core/constants` (incluida la DIVIPOLA del DANE con 33 departamentos y sus municipios), expuestos por `CatalogosService` y servidos por la API en `/api/catalogos/*`.
11. **Accesibilidad:** etiquetas `aria`, enlace "Saltar al contenido", foco visible dorado, navegación por teclado, `role="alert"` en errores, contraste azul/blanco.
12. **Responsive:** sidenav `side` en escritorio y `over` en móvil; el stepper pasa a **vertical** en pantallas < 960 px.

## 5. Conectar con la API en Python (FastAPI)

1. Levante la API (por ejemplo en `http://localhost:8000`) siguiendo **`docs/API_CONTRACT.md`** (endpoints, JSON de ejemplo, reglas y CORS).
2. Edite `src/environments/environment.development.ts` (y `environment.ts` para producción):

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  useMock: false,          // <- desactiva el backend simulado
  ...
};
```

3. Reinicie `npm start`. No hay que cambiar componentes ni servicios.

Puntos que el backend debe respetar:

- Responder en **snake_case** (el frontend convierte) o usar alias camelCase de Pydantic y quitar la conversión (ver contrato).
- Devolver `404` en `GET /api/hoja-vida` si el usuario aún no tiene hoja de vida.
- Errores con `{"detail": "..."}` (FastAPI lo hace por defecto con `HTTPException`).
- JWT con `sub` y `exp`; habilitar CORS para `http://localhost:4200`.
- Fotos y firmas: `POST /api/hoja-vida/{id}/foto|firma` con `multipart/form-data`, campo `archivo`, respuesta `{"url": "..."}`.

## 6. Personalización visual

- Colores: `src/styles/_variables.scss` (azul `#0B2D6B`, dorado `#F2B705`) y tema en `src/styles/_theme.scss`.
- Nombre y logo: el administrador los carga en **Administración → Institución e IA** (PNG/JPG/WebP, máx. 500 KB). No se incluyen logos oficiales en el código.
- SweetAlert2 personalizado en `src/styles/_sweetalert.scss` y `core/services/alert.service.ts`.

## 7. Fábrica de software (Google Antigravity)

El repositorio está preparado para trabajar con agentes de IA (Google Antigravity, y también Claude/Copilot):

```
AGENTS.md                          contexto general: stack, comandos, arquitectura y reglas no negociables
.agents/rules/01-arquitecto.md     rol arquitecto            (model_decision)
.agents/rules/02-frontend.md       rol frontend Angular      (glob: src/**)
.agents/rules/03-backend-contrato.md  rol backend / contrato FastAPI (model_decision)
.agents/rules/04-qa.md             rol QA                    (model_decision)
.agents/rules/05-seguridad.md      rol seguridad             (always_on)
.agents/rules/06-dominio-formato-unico.md  conocimiento del Formato Único (model_decision)
.agents/skills/nueva-funcionalidad   flujo completo: contrato → modelo → servicio → mock → UI → pruebas
.agents/skills/revision-seguridad    revisión OWASP Top 10 + Ley 1581
.agents/skills/prueba-e2e            guion de pruebas de usuario, IA y administrador
.agents/skills/conectar-backend      pasos para pasar del mock a FastAPI
.agents/skills/catalogos-institucionales  sedes, programas, IES y mapa
```

Uso: abra la carpeta en Antigravity; las reglas se cargan solas según su `trigger`. Pida, por ejemplo,
*"usa la skill nueva-funcionalidad para agregar certificados laborales"* o *"haz una revisión de seguridad"*.

**ArtCraft** (IDE de IA para imágenes y video) no se integra en la app: no aporta a la gestión de hojas de vida.
Puede usarse fuera del proyecto para crear piezas gráficas de la sustentación (banners, video de demostración),
nunca para recrear el logo institucional.

## 8. Funcionalidades

- Registro, inicio de sesión, recuperar contraseña, cierre de sesión (manual y por expiración del token).
- Dashboard con porcentaje de completitud total y por sección (`mat-progress-bar`).
- Stepper de 7 pasos: datos personales, formación académica, experiencia laboral, tiempo total de experiencia (cálculo automático), declaración y firma (canvas o imagen), observaciones de RR. HH. (solo lectura), resumen y vista previa.
- Detalle de la hoja de vida con eliminación de estudios, idiomas y experiencias (confirmación SweetAlert2).
- Formato oficial imprimible en tamaño carta (3 páginas), también desde la vista previa del paso 7.
- Mi cuenta: actualizar datos, cambiar contraseña y eliminar la hoja de vida.
- Vinculación institucional: tipo (docente, estudiante, egresado, administrativo, externo), sede, programa, profesión y área SNIES.
- Institución educativa de cada estudio con autocompletar desde la API (catálogo de IES).
- Importación de la hoja de vida en cualquier formato (PDF, Word, imagen, texto) con Gemini; archivo original adjunto.
- Firma opcional (dibujada o imagen); si existe, aparece en el formato oficial.
- **Administrador**: panel con indicadores, mapa de Colombia con las sedes (filtra por sede, región o departamento),
  docentes con hoja de vida enfocada en su carrera (por programa), nivel de formación, áreas, profesiones, idiomas,
  experiencia, formatos cargados y registros por mes; listado de hojas de vida con búsqueda y exportación CSV;
  gestión de usuarios y roles; CRUD de sedes; nombre y logo de la institución; parámetros de IA; auditoría.
- Seguridad: ver `docs/SEGURIDAD.md` (bloqueo por intentos, cierre por inactividad, CSP, validación de archivos, auditoría).
