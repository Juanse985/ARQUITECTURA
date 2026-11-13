# Contrato de la API REST (FastAPI) – SIGEHV

Base URL: `{apiUrl}` = `http://localhost:8000/api` (configurable en `src/environments/*.ts`).

## Convenciones

| Tema | Regla |
|---|---|
| Formato | JSON UTF-8. Archivos: `multipart/form-data` con el campo `archivo`. |
| Llaves | **snake_case** en la API (Python). El frontend usa **camelCase** y convierte en el borde HTTP con `core/utils/case-mapper.ts` (`toSnakeCase` al enviar, `toCamelCase` al recibir). |
| Fechas | `yyyy-MM-dd` (ISO 8601). Fecha-hora: `yyyy-MM-ddTHH:mm:ss`. El frontend muestra `dd/mm/aaaa`. |
| Autenticación | JWT en el encabezado `Authorization: Bearer <token>`. Rutas públicas: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/catalogos/*`. |
| Errores | Formato estándar de FastAPI: `{"detail": "mensaje"}` o, en 422, `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`. El `errorInterceptor` los muestra con SweetAlert2. |
| Propiedad | Cada usuario solo puede ver/modificar **su** hoja de vida → si no es suya, responder `403`. |

### Códigos de estado esperados

`200` OK · `201` creado · `204` eliminado (sin cuerpo) · `400` regla de negocio · `401` sin token / expirado (el frontend cierra sesión) · `403` recurso de otro usuario · `404` no existe · `409` duplicado · `422` validación Pydantic.

### Mapeo camelCase ⇄ snake_case en Python (Pydantic v2)

Recomendado: que FastAPI hable snake_case "puro" y el frontend convierta (ya implementado). Si prefiere que FastAPI acepte y devuelva camelCase, use alias:

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class Esquema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

class DatosPersonales(Esquema):
    primer_apellido: str
    segundo_apellido: str | None = None
    # ...

# Respuesta en camelCase:
@app.get("/api/hoja-vida", response_model=HojaVidaOut, response_model_by_alias=True)
```

> Si usa alias camelCase en el backend, quite las llamadas a `toSnakeCase/toCamelCase` de los servicios (`core/services/*.service.ts`).

---

## 1. Autenticación

### POST `/auth/register` → 201
Request:
```json
{ "nombres": "Laura Camila", "apellidos": "Rodríguez Gómez", "email": "laura@correo.com", "password": "Clave1234" }
```
Response (también la devuelve `/auth/login`):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 7200,
  "usuario": { "id": 1, "rol": "USUARIO", "activo": true, "nombres": "Laura Camila", "apellidos": "Rodríguez Gómez", "email": "laura@correo.com", "fecha_registro": "2026-02-01T10:00:00" }
}
```
Errores: `409 {"detail": "Ya existe una cuenta registrada con ese correo electrónico."}`

### POST `/auth/login` → 200
```json
{ "email": "laura@correo.com", "password": "Clave1234" }
```
Errores: `401 {"detail": "Correo o contraseña incorrectos."}`

> El JWT debe incluir `sub` (id del usuario) y `exp` (epoch en segundos). El frontend lee `exp` para cerrar la sesión automáticamente al expirar.

### GET `/auth/me` → 200
```json
{ "id": 1, "nombres": "Laura Camila", "apellidos": "Rodríguez Gómez", "email": "laura@correo.com", "fecha_registro": "2026-02-01T10:00:00" }
```

### PUT `/auth/me` → 200 (mismo cuerpo de respuesta que GET)
```json
{ "nombres": "Laura Camila", "apellidos": "Rodríguez Gómez", "email": "laura@correo.com" }
```

### PUT `/auth/me/password` → 200
```json
{ "password_actual": "Clave1234", "password_nueva": "NuevaClave99" }
```
Response: `{ "mensaje": "Contraseña actualizada correctamente." }` · Error `400` si la actual no coincide.

### POST `/auth/forgot-password` → 200
```json
{ "email": "laura@correo.com" }
```
Response: `{ "mensaje": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña." }`

---

## 2. Hoja de vida (agregado completo)

### GET `/hoja-vida` → 200 | 404
Devuelve la hoja de vida del usuario autenticado. `404` si aún no la ha creado (el frontend lo interpreta como "nueva").

```json
{
  "id": 1,
  "usuario_id": 1,
  "estado": "COMPLETA",
  "datos_personales": {
    "primer_apellido": "Rodríguez",
    "segundo_apellido": "Gómez",
    "nombres": "Laura Camila",
    "tipo_documento": "CC",
    "numero_documento": "1012345678",
    "sexo": "F",
    "nacionalidad": "COL",
    "pais_nacionalidad": null,
    "libreta_militar": { "clase": null, "numero": null, "distrito_militar": null },
    "fecha_nacimiento": "1998-04-15",
    "lugar_nacimiento": { "pais": "Colombia", "departamento": "25", "municipio": "25754" },
    "direccion_correspondencia": "Calle 81 B # 72 B - 70",
    "ubicacion_correspondencia": { "pais": "Colombia", "departamento": "11", "municipio": "11001" },
    "telefono": "3101234567",
    "email": "laura@correo.com",
    "foto_url": null
  },
  "educacion_basica": { "ultimo_grado": 11, "titulo": "Bachiller académico", "mes_grado": 11, "anio_grado": 2015 },
  "educacion_superior": [
    { "id": 1, "modalidad": "TL", "semestres_aprobados": 6, "graduado": true, "titulo": "Tecnología en Desarrollo de Software",
      "mes_terminacion": 12, "anio_terminacion": 2019, "tarjeta_profesional": null }
  ],
  "idiomas": [ { "id": 1, "idioma": "Inglés", "habla": "B", "lee": "MB", "escribe": "B" } ],
  "experiencia_laboral": [
    { "id": 1, "empresa": "Alcaldía Municipal de Soacha", "tipo_entidad": "PUBLICA", "pais": "Colombia",
      "departamento": "25", "municipio": "25754", "correo_entidad": "contactenos@soacha.gov.co", "telefonos": "6017305580",
      "fecha_ingreso": "2023-02-01", "fecha_retiro": null, "empleo_actual": true, "cargo": "Técnico de sistemas",
      "dependencia": "Secretaría TIC", "direccion": "Calle 13 # 7 - 30" }
  ],
  "tiempo_experiencia": {
    "servidor_publico": { "anios": 3, "meses": 9 },
    "sector_privado": { "anios": 2, "meses": 11 },
    "independiente": { "anios": 0, "meses": 6 },
    "total": { "anios": 7, "meses": 2 }
  },
  "declaracion": {
    "inhabilidad": "NO",
    "certifica_veracidad": true,
    "ciudad_diligenciamiento": "Bogotá D.C.",
    "fecha_diligenciamiento": "2026-11-01",
    "firma_url": null,
    "autoriza_tratamiento_datos": true
  },
  "observaciones_rrhh": null,
  "fecha_creacion": "2026-02-01T10:05:00",
  "fecha_actualizacion": "2026-11-01T09:30:00"
}
```

**Catálogos (valores válidos):**

| Campo | Valores |
|---|---|
| `tipo_documento` | `CC`, `CE`, `PAS` |
| `sexo` | `F`, `M` |
| `nacionalidad` | `COL`, `EXT` (si `EXT`, `pais_nacionalidad` es obligatorio) |
| `libreta_militar.clase` | `PRIMERA`, `SEGUNDA`, `null` |
| `ultimo_grado` | 1 a 11 |
| `modalidad` | `TC`, `TL`, `TE`, `UN`, `ES`, `MG`, `DOC` |
| `habla` / `lee` / `escribe` | `R`, `B`, `MB` |
| `tipo_entidad` | `PUBLICA`, `PRIVADA` |
| `inhabilidad` | `SI`, `NO` |
| `estado` | `BORRADOR`, `COMPLETA` |
| `departamento` / `municipio` (Colombia) | Código DIVIPOLA del DANE (2 y 5 dígitos). Para otros países: texto libre. |

### POST `/hoja-vida` → 201
Cuerpo = el objeto anterior **sin** `id`, `usuario_id`, `fecha_creacion`, `fecha_actualizacion`, `observaciones_rrhh`. Los elementos de las listas pueden venir sin `id` (la BD los asigna). `409` si el usuario ya tiene una.

### PUT `/hoja-vida/{id}` → 200
Mismo cuerpo que POST. **Reemplaza** la hoja de vida completa (incluidas las listas: los ítems que no lleguen se eliminan; los que llegan sin `id` se crean). Se usa para el guardado de borrador en cada paso y para el guardado final.

### DELETE `/hoja-vida/{id}` → 204

---

## 3. Subsecciones

Todas requieren JWT y validan que `{id}` pertenezca al usuario.

### Secciones de objeto único
`/hoja-vida/{id}/datos-personales` · `/hoja-vida/{id}/educacion-basica` · `/hoja-vida/{id}/tiempo-experiencia` · `/hoja-vida/{id}/declaracion`

| Método | Respuesta |
|---|---|
| GET | 200 con el objeto (404 si no está diligenciada) |
| POST | 201 crea la sección |
| PUT | 200 reemplaza la sección |
| DELETE | 204 |

Ejemplo `PUT /hoja-vida/1/educacion-basica`:
```json
{ "ultimo_grado": 11, "titulo": "Bachiller académico", "mes_grado": 11, "anio_grado": 2015 }
```
Ejemplo `PUT /hoja-vida/1/tiempo-experiencia`:
```json
{ "servidor_publico": {"anios": 3, "meses": 9}, "sector_privado": {"anios": 2, "meses": 11},
  "independiente": {"anios": 0, "meses": 6}, "total": {"anios": 7, "meses": 2} }
```
Ejemplo `PUT /hoja-vida/1/declaracion`:
```json
{ "inhabilidad": "NO", "certifica_veracidad": true, "ciudad_diligenciamiento": "Bogotá D.C.",
  "fecha_diligenciamiento": "2026-11-01", "firma_url": null, "autoriza_tratamiento_datos": true }
```
> Reglas a validar en el backend: `certifica_veracidad` y `autoriza_tratamiento_datos` deben ser `true`; `meses` entre 0 y 11.

### Secciones de lista
`/hoja-vida/{id}/educacion-superior` · `/hoja-vida/{id}/idiomas` · `/hoja-vida/{id}/experiencia`

| Método y ruta | Respuesta |
|---|---|
| GET `/hoja-vida/{id}/idiomas` | 200 `[ {...}, {...} ]` |
| POST `/hoja-vida/{id}/idiomas` | 201 ítem creado con `id` |
| GET `/hoja-vida/{id}/idiomas/{item_id}` | 200 ítem |
| PUT `/hoja-vida/{id}/idiomas/{item_id}` | 200 ítem actualizado |
| DELETE `/hoja-vida/{id}/idiomas/{item_id}` | 204 |

Ejemplo `POST /hoja-vida/1/educacion-superior`:
```json
{ "modalidad": "UN", "semestres_aprobados": 10, "graduado": true, "titulo": "Ingeniería de Sistemas",
  "mes_terminacion": 6, "anio_terminacion": 2026, "tarjeta_profesional": "25255-123456" }
```
Response 201: el mismo objeto con `"id": 7`.

Ejemplo `POST /hoja-vida/1/idiomas`:
```json
{ "idioma": "Inglés", "habla": "B", "lee": "MB", "escribe": "B" }
```

Ejemplo `POST /hoja-vida/1/experiencia`:
```json
{ "empresa": "Soluciones Andinas S.A.S.", "tipo_entidad": "PRIVADA", "pais": "Colombia", "departamento": "11",
  "municipio": "11001", "correo_entidad": "rrhh@solucionesandinas.com", "telefonos": "6015550101",
  "fecha_ingreso": "2020-01-15", "fecha_retiro": "2022-12-20", "empleo_actual": false,
  "cargo": "Desarrolladora junior", "dependencia": "Tecnología", "direccion": "Carrera 7 # 71 - 21" }
```
> Reglas: si `graduado = true` → `mes_terminacion` y `anio_terminacion` obligatorios. Si `empleo_actual = false` → `fecha_retiro` obligatoria y `>= fecha_ingreso`. Solo una experiencia con `empleo_actual = true`. Los períodos no deben cruzarse.

---

## 4. Archivos (multipart/form-data)

### POST `/hoja-vida/{id}/foto` · POST `/hoja-vida/{id}/firma` → 200
Campo de formulario: `archivo` (PNG o JPG, máx. 1 MB).

```bash
curl -X POST http://localhost:8000/api/hoja-vida/1/foto \
  -H "Authorization: Bearer <token>" -F "archivo=@foto.png"
```
Response:
```json
{ "url": "http://localhost:8000/media/hojas-vida/1/foto.png" }
```
El backend debe actualizar `datos_personales.foto_url` o `declaracion.firma_url` con esa URL.

FastAPI:
```python
from fastapi import UploadFile, File

@router.post("/hoja-vida/{id}/foto")
async def subir_foto(id: int, archivo: UploadFile = File(...), usuario=Depends(usuario_actual)):
    ...
```

---

## 5. Catálogos (públicos)

### GET `/catalogos/departamentos` → 200
```json
[ { "codigo": "05", "nombre": "Antioquia" }, { "codigo": "11", "nombre": "Bogotá D.C." } ]
```

### GET `/catalogos/municipios?departamento=25` → 200
```json
[ { "codigo": "25754", "nombre": "Soacha", "departamento": "25" }, { "codigo": "25899", "nombre": "Zipaquirá", "departamento": "25" } ]
```
Los datos DIVIPOLA completos (33 departamentos y sus municipios) están en `src/app/core/constants/divipola.ts`; puede usarlos para poblar la base de datos.

---

## 6. Institución, sedes y catálogos institucionales

### GET `/institucion` → 200 (público)
```json
{ "nombre": "Corporación Universitaria Minuto de Dios", "sigla": "UNIMINUTO", "sitio_web": "https://www.uniminuto.edu",
  "logo_url": "https://.../logo.png", "ia_habilitada": true, "modelo_ia": "gemini-3.8-flash" }
```
### PUT `/institucion` → 200 (solo ADMIN) — mismo cuerpo.

### GET `/catalogos/sedes` → 200
```json
[ { "id": "CUN-SOA", "nombre": "Soacha", "region": "CUNDINAMARCA_BOYACA", "ciudad": "Soacha",
    "departamento": "25", "municipio": "25754", "lat": 4.579, "lng": -74.217, "activa": true } ]
```
### GET `/catalogos/regiones` · GET `/catalogos/programas`
```json
[ { "id": "ING-SIS", "nombre": "Ingeniería de Sistemas", "nivel": "PROFESIONAL", "area": "ING" } ]
```
### GET `/catalogos/instituciones?q=antio` → 200 (autocompletar de IES; en producción, sincronizado con el SNIES)
```json
[ { "nombre": "Universidad de Antioquia", "sigla": "UdeA" } ]
```

### Sección institucional de la hoja de vida
`GET/POST/PUT/DELETE /hoja-vida/{id}/institucional`
```json
{ "tipo_vinculacion": "DOCENTE", "sede_id": "CUN-SOA", "programa_id": "ING-SIS",
  "profesion": "Ingeniera de Sistemas", "area_conocimiento": "ING" }
```
`tipo_vinculacion`: `DOCENTE`, `ESTUDIANTE`, `EGRESADO`, `ADMINISTRATIVO`, `EXTERNO`.
`area_conocimiento` (SNIES): `AGRO`, `ARTES`, `EDU`, `SALUD`, `SOCIALES`, `ECO`, `ING`, `MAT`.
La hoja de vida incluye además `origen` (`FORMULARIO` | `IMPORTADA_IA`) y `archivo_original`;
cada ítem de `educacion_superior` agrega `institucion` y `area_conocimiento`.

### POST `/hoja-vida/{id}/archivo-original` (multipart) → 200
Campos: `archivo` (PDF, DOCX, JPG, PNG o TXT; máx. 5 MB) y `procesado_con_ia` (`true`/`false`).
```json
{ "url": "https://.../hv/1/original.pdf" }
```
`DELETE /hoja-vida/{id}/archivo-original` → 204. Errores: `413` (tamaño), `415` (tipo no permitido).

## 7. Inteligencia artificial (producción)

### POST `/ia/extraer-hoja-vida` (multipart: `archivo`) → 200
El backend envía el documento a Gemini con `GEMINI_API_KEY` del servidor y devuelve el JSON normalizado
(misma estructura que el prompt de `core/services/gemini.service.ts`):
```json
{ "datos_personales": { "primer_apellido": "Ramírez", "nombres": "Pedro Pablo", "...": "..." },
  "profesion": "Ingeniero Industrial", "area_conocimiento": "ING",
  "educacion_superior": [ { "modalidad": "UN", "graduado": true, "titulo": "Ingeniería Industrial", "institucion": "Universidad de Antioquia" } ],
  "idiomas": [ { "idioma": "Inglés", "habla": "MB", "lee": "MB", "escribe": "B" } ],
  "experiencia_laboral": [ { "empresa": "Gobernación de Antioquia", "tipo_entidad": "PUBLICA", "fecha_ingreso": "2015-01-01", "empleo_actual": true } ] }
```

## 8. Administración (rol `ADMIN`; cualquier otro rol → 403)

Filtros comunes (query): `region`, `departamento` (código DANE), `sede_id`, `tipo_vinculacion`.

| Método y ruta | Descripción |
|---|---|
| GET `/admin/estadisticas` | Indicadores y distribuciones (ver ejemplo) |
| GET `/admin/hojas-vida?q=&estado=&pagina=1&tamano=10` | Listado paginado con datos mínimos |
| GET `/admin/hojas-vida/{id}` | Hoja de vida completa (queda en auditoría) |
| GET `/admin/usuarios` · PUT `/admin/usuarios/{id}` `{ "rol": "ADMIN", "activo": true }` | Gestión de roles |
| GET/POST `/admin/sedes` · PUT/DELETE `/admin/sedes/{id}` | CRUD de sedes (409 si tiene HV asociadas) |
| GET `/admin/auditoria?pagina=1&tamano=20` | Bitácora |

Ejemplo `GET /admin/estadisticas?region=CUNDINAMARCA_BOYACA`:
```json
{
  "total_usuarios": 181, "total_hv": 39, "completas": 27, "borradores": 12, "importadas_ia": 11,
  "con_archivo_original": 15, "experiencia_promedio_anios": 4.1, "docentes": 14, "docentes_alineados": 10,
  "por_tipo_vinculacion": [ { "clave": "DOCENTE", "etiqueta": "Docente / profesor", "total": 14 } ],
  "por_nivel_formacion": [ { "clave": "Magíster", "etiqueta": "Magíster", "total": 7 } ],
  "por_area_conocimiento": [ { "clave": "ING", "etiqueta": "Ingeniería, arquitectura, urbanismo y afines", "total": 9 } ],
  "top_profesiones": [ { "clave": "Psicología", "etiqueta": "Psicología", "total": 4 } ],
  "idiomas": [ { "clave": "Inglés", "etiqueta": "Inglés", "total": 20 } ],
  "por_formato_archivo": [ { "clave": "PDF", "etiqueta": "PDF", "total": 8 } ],
  "rangos_experiencia": [ { "clave": "1 a 3 años", "etiqueta": "1 a 3 años", "total": 10 } ],
  "por_sede": [ { "sede_id": "CUN-SOA", "nombre": "Soacha", "region": "CUNDINAMARCA_BOYACA", "departamento": "25", "ciudad": "Soacha",
                  "lat": 4.579, "lng": -74.217, "total_hv": 19, "docentes": 7, "docentes_alineados": 5, "estudiantes": 9 } ],
  "por_departamento": [ { "clave": "25", "etiqueta": "Cundinamarca", "total": 39 } ],
  "por_region": [ { "clave": "CUNDINAMARCA_BOYACA", "etiqueta": "Cundinamarca - Boyacá", "total": 39 } ],
  "alineacion_por_programa": [ { "programa_id": "ING-SIS", "programa": "Ingeniería de Sistemas", "docentes": 3, "alineados": 2 } ],
  "registros_por_mes": [ { "clave": "2026-10", "etiqueta": "2026-10", "total": 5 } ]
}
```
**Docente enfocado en su carrera:** `tipo_vinculacion = DOCENTE` y tiene al menos un título graduado (o el área
declarada) en la misma `area_conocimiento` del programa donde enseña.

## 9. Seguridad de la API
Ver `docs/SEGURIDAD.md`. Resumen: 401 sin token o token vencido; 403 por rol o propiedad; 429 tras 5 intentos
fallidos de login (bloqueo 5 min); los usuarios desactivados no pueden iniciar sesión.

## 10. CORS (FastAPI)

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
