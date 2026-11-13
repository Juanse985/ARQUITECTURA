import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, from } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DEPARTAMENTOS, MUNICIPIOS } from '../constants/divipola';
import { CONFIGURACION_INSTITUCIONAL_DEFECTO, INSTITUCIONES_EDUCATIVAS, PROGRAMAS, REGIONES, SEDES_DEFECTO } from '../constants/institucion';
import { ArchivoHojaVida, ConfiguracionInstitucional, FiltroEstadisticas, FormatoArchivo, HojaVida, RegistroAuditoria, Sede, Usuario, UsuarioAdmin } from '../models';
import { toCamelCase, toSnakeCase } from '../utils/case-mapper';
import { calcularEstadisticas, filtrarHojas, resumenHoja } from './mock-estadisticas';
import { CREDENCIALES_DEMO, HOJA_VIDA_DEMO, USUARIOS_BASE, UsuarioMock, generarDatosSinteticos } from './mock-data';

/**
 * BACKEND SIMULADO (solo cuando environment.useMock === true).
 *
 * Responde como lo hará la API FastAPI (snake_case, códigos HTTP, JWT con `exp`
 * y `rol`) y persiste en localStorage. Implementa además los controles de
 * seguridad que el backend real DEBE replicar:
 *   - contraseñas con hash + salt (nunca en claro),
 *   - bloqueo temporal tras 5 intentos fallidos,
 *   - autorización por ROL consultando la base (no confiando en el token),
 *   - propiedad del recurso (403 si la hoja de vida es de otro usuario),
 *   - validación de tipo real de archivo (firma de bytes) y tamaño,
 *   - bitácora de auditoría de acciones sensibles.
 */

interface MockDb {
  version: number;
  usuarios: UsuarioMock[];
  hojasVida: HojaVida[];
  sedes: Sede[];
  configuracion: ConfiguracionInstitucional;
  auditoria: RegistroAuditoria[];
  seq: number;
}

const DB_KEY = 'sigehv_mock_db';
const DB_VERSION = 2;
const LATENCIA_MS = 300;
const DURACION_TOKEN_S = 2 * 60 * 60;
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;
const MAX_ARCHIVO = 5 * 1024 * 1024;

class ErrorApi extends Error {
  constructor(readonly status: number, readonly detail: string) {
    super(detail);
  }
}

// ----------------------------------------------------------------------------- Utilidades
async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function nuevoSalt(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const ahoraIso = () => new Date().toISOString().slice(0, 19);
const b64url = (o: object) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function crearToken(u: Usuario): string {
  const ahora = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: String(u.id), rol: u.rol, iat: ahora, exp: ahora + DURACION_TOKEN_S })}.mock-signature`;
}

let dbMemoria: MockDb | null = null;

async function cargarDb(): Promise<MockDb> {
  if (dbMemoria) return dbMemoria;
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      const db = JSON.parse(raw) as MockDb;
      if (db.version === DB_VERSION) return (dbMemoria = db);
    } catch { /* se regenera */ }
  }
  // Semilla: usuarios demo + datos sintéticos.
  const usuarios: UsuarioMock[] = [];
  for (const u of USUARIOS_BASE) {
    const salt = nuevoSalt();
    const pass = CREDENCIALES_DEMO.find((c) => c.email === u.email)!.password;
    usuarios.push({ ...u, salt, passwordHash: await sha256(salt + pass) });
  }
  const sint = generarDatosSinteticos();
  for (const u of sint.usuarios) usuarios.push({ ...u, salt: 'x', passwordHash: 'cuenta-de-prueba-sin-acceso' });
  dbMemoria = {
    version: DB_VERSION,
    usuarios,
    hojasVida: [structuredClone(HOJA_VIDA_DEMO), ...sint.hojas],
    sedes: structuredClone(SEDES_DEFECTO),
    configuracion: { ...CONFIGURACION_INSTITUCIONAL_DEFECTO },
    auditoria: [],
    seq: 1000,
  };
  guardarDb(dbMemoria);
  return dbMemoria;
}

function guardarDb(db: MockDb): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // localStorage lleno (p. ej. muchas fotos): se conserva en memoria.
    console.warn('[mock] No fue posible persistir en localStorage (cuota excedida).');
  }
}

function auditar(db: MockDb, u: Usuario | null, accion: string, detalle: string, resultado: 'OK' | 'FALLO' = 'OK', email?: string): void {
  db.auditoria.unshift({ id: ++db.seq, fecha: ahoraIso(), usuarioId: u?.id ?? null, email: u?.email ?? email ?? null, accion, detalle, resultado });
  db.auditoria = db.auditoria.slice(0, 500);
}

function usuarioDelToken(req: HttpRequest<unknown>, db: MockDb): UsuarioMock | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(auth.slice(7).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))) as { sub: string; exp: number };
    if (p.exp * 1000 < Date.now()) return null;
    const u = db.usuarios.find((x) => x.id === Number(p.sub));
    return u?.activo ? u : null;
  } catch {
    return null;
  }
}

const publico = ({ passwordHash, salt, intentosFallidos, bloqueadoHasta, ultimoAcceso, ...u }: UsuarioMock): Usuario => u;

function respuesta<T>(body: T, status = 200): HttpResponse<unknown> {
  return new HttpResponse({ status, body: body === null ? null : toSnakeCase(body) });
}

function leerDataUrl(f: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}

/** Valida el tipo REAL del archivo por su firma de bytes (no por la extensión). */
async function detectarFormato(f: Blob): Promise<FormatoArchivo | null> {
  const b = new Uint8Array(await f.slice(0, 8).arrayBuffer());
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  if (hex.startsWith('25504446')) return 'PDF'; // %PDF
  if (hex.startsWith('504b0304')) return 'DOCX'; // ZIP (docx)
  if (hex.startsWith('89504e47') || hex.startsWith('ffd8ff')) return 'IMAGEN';
  if (f.type === 'text/plain') return 'TEXTO';
  return null;
}

function filtroDesdeParams(req: HttpRequest<unknown>): FiltroEstadisticas {
  return {
    region: (req.params.get('region') as FiltroEstadisticas['region']) || null,
    departamento: req.params.get('departamento') || null,
    sedeId: req.params.get('sede_id') || null,
    tipoVinculacion: (req.params.get('tipo_vinculacion') as FiltroEstadisticas['tipoVinculacion']) || null,
  };
}

// ----------------------------------------------------------------------------- Rutas
async function procesar(req: HttpRequest<unknown>): Promise<HttpResponse<unknown>> {
  const db = await cargarDb();
  const ruta = req.url.slice(environment.apiUrl.length).split('?')[0];
  const metodo = req.method;
  const formData = req.body instanceof FormData ? req.body : null;
  const body: Record<string, any> = formData ? {} : toCamelCase<Record<string, any>>(req.body ?? {});

  // ---------------------------------------------------------------- Públicas
  if (metodo === 'GET') {
    if (ruta === '/catalogos/departamentos') return respuesta(DEPARTAMENTOS);
    if (ruta === '/catalogos/municipios') return respuesta(MUNICIPIOS.filter((m) => m.departamento === req.params.get('departamento')));
    if (ruta === '/catalogos/sedes') return respuesta(db.sedes.filter((s) => s.activa));
    if (ruta === '/catalogos/regiones') return respuesta(REGIONES);
    if (ruta === '/catalogos/programas') return respuesta(PROGRAMAS);
    if (ruta === '/catalogos/instituciones') {
      const q = (req.params.get('q') ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return respuesta(INSTITUCIONES_EDUCATIVAS.filter((i) => !q || norm(i.nombre).includes(q) || norm(i.sigla ?? '').includes(q)).slice(0, 20));
    }
    if (ruta === '/institucion') return respuesta(db.configuracion);
  }

  if (metodo === 'POST' && ruta === '/auth/login') {
    const email = String(body['email'] ?? '').toLowerCase().trim();
    const u = db.usuarios.find((x) => x.email.toLowerCase() === email);
    if (u?.bloqueadoHasta && u.bloqueadoHasta > Date.now()) {
      const min = Math.ceil((u.bloqueadoHasta - Date.now()) / 60000);
      auditar(db, u, 'LOGIN', 'Intento con cuenta bloqueada', 'FALLO');
      guardarDb(db);
      throw new ErrorApi(429, `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${min} minuto(s).`);
    }
    const ok = !!u && u.activo && (await sha256(u.salt + String(body['password'] ?? ''))) === u.passwordHash;
    if (!ok) {
      if (u) {
        u.intentosFallidos++;
        if (u.intentosFallidos >= MAX_INTENTOS) {
          u.bloqueadoHasta = Date.now() + BLOQUEO_MS;
          u.intentosFallidos = 0;
        }
      }
      auditar(db, u ?? null, 'LOGIN', 'Credenciales inválidas', 'FALLO', email);
      guardarDb(db);
      // Mensaje genérico: no revela si el correo existe.
      throw new ErrorApi(401, u && !u.activo ? 'La cuenta está desactivada. Contacta al administrador.' : 'Correo o contraseña incorrectos.');
    }
    u.intentosFallidos = 0;
    u.bloqueadoHasta = null;
    u.ultimoAcceso = ahoraIso();
    auditar(db, u, 'LOGIN', 'Inicio de sesión');
    guardarDb(db);
    return respuesta({ accessToken: crearToken(u), tokenType: 'bearer', expiresIn: DURACION_TOKEN_S, usuario: publico(u) });
  }

  if (metodo === 'POST' && ruta === '/auth/register') {
    const email = String(body['email'] ?? '').toLowerCase().trim();
    if (db.usuarios.some((x) => x.email.toLowerCase() === email)) throw new ErrorApi(409, 'Ya existe una cuenta registrada con ese correo electrónico.');
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(String(body['password'] ?? ''))) throw new ErrorApi(422, 'La contraseña no cumple la política de seguridad.');
    const salt = nuevoSalt();
    const u: UsuarioMock = {
      id: ++db.seq, rol: 'USUARIO', activo: true, nombres: String(body['nombres']).slice(0, 80), apellidos: String(body['apellidos']).slice(0, 80),
      email, fechaRegistro: ahoraIso(), salt, passwordHash: await sha256(salt + body['password']), intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: ahoraIso(),
    };
    db.usuarios.push(u);
    auditar(db, u, 'REGISTRO', 'Creación de cuenta');
    guardarDb(db);
    return respuesta({ accessToken: crearToken(u), tokenType: 'bearer', expiresIn: DURACION_TOKEN_S, usuario: publico(u) }, 201);
  }

  if (metodo === 'POST' && ruta === '/auth/forgot-password') {
    auditar(db, null, 'RECUPERAR_CLAVE', 'Solicitud de recuperación', 'OK', String(body['email'] ?? ''));
    guardarDb(db);
    return respuesta({ mensaje: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
  }

  // ---------------------------------------------------------------- Autenticadas
  const usuario = usuarioDelToken(req, db);
  if (!usuario) throw new ErrorApi(401, 'No autenticado o token expirado.');
  const esAdmin = usuario.rol === 'ADMIN';

  if (ruta === '/auth/me') {
    if (metodo === 'GET') return respuesta(publico(usuario));
    if (metodo === 'PUT') {
      const email = String(body['email'] ?? '').toLowerCase().trim();
      if (db.usuarios.some((x) => x.id !== usuario.id && x.email.toLowerCase() === email)) throw new ErrorApi(409, 'El correo ya está en uso por otra cuenta.');
      Object.assign(usuario, { nombres: body['nombres'], apellidos: body['apellidos'], email });
      auditar(db, usuario, 'PERFIL', 'Actualización de datos de cuenta');
      guardarDb(db);
      return respuesta(publico(usuario));
    }
  }
  if (metodo === 'PUT' && ruta === '/auth/me/password') {
    if ((await sha256(usuario.salt + body['passwordActual'])) !== usuario.passwordHash) {
      auditar(db, usuario, 'CAMBIO_CLAVE', 'Contraseña actual incorrecta', 'FALLO');
      guardarDb(db);
      throw new ErrorApi(400, 'La contraseña actual no es correcta.');
    }
    usuario.salt = nuevoSalt();
    usuario.passwordHash = await sha256(usuario.salt + body['passwordNueva']);
    auditar(db, usuario, 'CAMBIO_CLAVE', 'Contraseña actualizada');
    guardarDb(db);
    return respuesta({ mensaje: 'Contraseña actualizada correctamente.' });
  }

  // ---------------------------------------------------------------- Administración (rol ADMIN)
  if (ruta.startsWith('/admin') || (ruta === '/institucion' && metodo === 'PUT')) {
    if (!esAdmin) {
      auditar(db, usuario, 'ACCESO_DENEGADO', `${metodo} ${ruta}`, 'FALLO');
      guardarDb(db);
      throw new ErrorApi(403, 'Esta acción requiere rol de administrador.');
    }
    return procesarAdmin(req, db, usuario, ruta, metodo, body, formData);
  }

  // ---------------------------------------------------------------- Hoja de vida del usuario
  const hvDelUsuario = () => db.hojasVida.find((h) => h.usuarioId === usuario.id);
  const tocar = (hv: HojaVida) => {
    hv.fechaActualizacion = ahoraIso();
    guardarDb(db);
  };

  if (ruta === '/hoja-vida') {
    if (metodo === 'GET') {
      const hv = hvDelUsuario();
      if (!hv) throw new ErrorApi(404, 'El usuario aún no ha creado su hoja de vida.');
      return respuesta(hv);
    }
    if (metodo === 'POST') {
      if (hvDelUsuario()) throw new ErrorApi(409, 'El usuario ya tiene una hoja de vida registrada.');
      const hv = { ...(body as HojaVida), id: ++db.seq, usuarioId: usuario.id, observacionesRrhh: null, archivoOriginal: null, fechaCreacion: ahoraIso(), fechaActualizacion: ahoraIso() };
      asignarIds(hv, db);
      db.hojasVida.push(hv);
      auditar(db, usuario, 'HV_CREAR', `Hoja de vida #${hv.id}`);
      guardarDb(db);
      return respuesta(hv, 201);
    }
  }

  const m = /^\/hoja-vida\/(\d+)(?:\/([a-z-]+))?(?:\/(\d+))?$/.exec(ruta);
  if (!m) throw new ErrorApi(404, `Ruta no encontrada: ${metodo} ${ruta}`);
  const hv = db.hojasVida.find((h) => h.id === Number(m[1]));
  if (!hv) throw new ErrorApi(404, 'Hoja de vida no encontrada.');
  if (hv.usuarioId !== usuario.id) {
    auditar(db, usuario, 'ACCESO_DENEGADO', `Hoja de vida ajena #${hv.id}`, 'FALLO');
    guardarDb(db);
    throw new ErrorApi(403, 'No puedes acceder a la hoja de vida de otro usuario.');
  }
  const sub = m[2];
  const itemId = m[3] ? Number(m[3]) : null;

  if (!sub) {
    if (metodo === 'GET') return respuesta(hv);
    if (metodo === 'PUT') {
      Object.assign(hv, body, { id: hv.id, usuarioId: hv.usuarioId, fechaCreacion: hv.fechaCreacion, archivoOriginal: hv.archivoOriginal, observacionesRrhh: hv.observacionesRrhh });
      asignarIds(hv, db);
      tocar(hv);
      return respuesta(hv);
    }
    if (metodo === 'DELETE') {
      db.hojasVida = db.hojasVida.filter((h) => h.id !== hv.id);
      auditar(db, usuario, 'HV_ELIMINAR', `Hoja de vida #${hv.id}`);
      guardarDb(db);
      return respuesta(null, 204);
    }
  }

  // Archivos (multipart)
  if ((sub === 'foto' || sub === 'firma' || sub === 'archivo-original') && metodo === 'POST' && formData) {
    const f = formData.get('archivo');
    if (!(f instanceof Blob)) throw new ErrorApi(422, 'Debe adjuntar el campo "archivo".');
    if (f.size > MAX_ARCHIVO) throw new ErrorApi(413, 'El archivo supera el tamaño máximo permitido (5 MB).');
    const formato = await detectarFormato(f);
    if (sub !== 'archivo-original' && formato !== 'IMAGEN') throw new ErrorApi(415, 'Solo se permiten imágenes PNG o JPG.');
    if (!formato) throw new ErrorApi(415, 'Formato no permitido. Use PDF, DOCX, JPG, PNG o TXT.');
    const url = await leerDataUrl(f);
    if (sub === 'foto' && hv.datosPersonales) hv.datosPersonales.fotoUrl = url;
    if (sub === 'firma' && hv.declaracion) hv.declaracion.firmaUrl = url;
    if (sub === 'archivo-original') {
      const archivo: ArchivoHojaVida = {
        nombre: (f as File).name ?? 'hoja-de-vida', tipoMime: f.type, tamano: f.size, formato, url, fechaCarga: ahoraIso(),
        procesadoConIa: formData.get('procesado_con_ia') === 'true',
      };
      hv.archivoOriginal = archivo;
      if (archivo.procesadoConIa) hv.origen = 'IMPORTADA_IA';
      auditar(db, usuario, 'HV_ARCHIVO', `Carga de ${formato} (${Math.round(f.size / 1024)} KB)`);
    }
    tocar(hv);
    return respuesta({ url });
  }
  if (sub === 'archivo-original' && metodo === 'DELETE') {
    hv.archivoOriginal = null;
    tocar(hv);
    return respuesta(null, 204);
  }

  // Secciones únicas
  const UNICAS: Record<string, keyof HojaVida> = {
    'datos-personales': 'datosPersonales', 'educacion-basica': 'educacionBasica', 'tiempo-experiencia': 'tiempoExperiencia',
    declaracion: 'declaracion', institucional: 'institucional',
  };
  const LISTAS: Record<string, keyof HojaVida> = { 'educacion-superior': 'educacionSuperior', idiomas: 'idiomas', experiencia: 'experienciaLaboral' };

  if (sub && sub in UNICAS) {
    const k = UNICAS[sub];
    if (metodo === 'GET') {
      if (!hv[k]) throw new ErrorApi(404, 'Sección sin diligenciar.');
      return respuesta(hv[k]);
    }
    if (metodo === 'POST' || metodo === 'PUT') {
      (hv as any)[k] = body;
      tocar(hv);
      return respuesta(hv[k], metodo === 'POST' ? 201 : 200);
    }
    if (metodo === 'DELETE') {
      (hv as any)[k] = null;
      tocar(hv);
      return respuesta(null, 204);
    }
  }

  if (sub && sub in LISTAS) {
    const lista = hv[LISTAS[sub]] as { id?: number }[];
    if (metodo === 'GET' && itemId === null) return respuesta(lista);
    if (metodo === 'POST' && itemId === null) {
      const item = { ...body, id: ++db.seq };
      lista.push(item);
      tocar(hv);
      return respuesta(item, 201);
    }
    const idx = lista.findIndex((x) => x.id === itemId);
    if (idx < 0) throw new ErrorApi(404, 'Registro no encontrado.');
    if (metodo === 'GET') return respuesta(lista[idx]);
    if (metodo === 'PUT') {
      lista[idx] = { ...body, id: itemId! };
      tocar(hv);
      return respuesta(lista[idx]);
    }
    if (metodo === 'DELETE') {
      lista.splice(idx, 1);
      tocar(hv);
      return respuesta(null, 204);
    }
  }

  throw new ErrorApi(405, `Método no permitido: ${metodo} ${ruta}`);
}

async function procesarAdmin(
  req: HttpRequest<unknown>, db: MockDb, admin: UsuarioMock, ruta: string, metodo: string, body: Record<string, any>, formData: FormData | null,
): Promise<HttpResponse<unknown>> {
  if (ruta === '/institucion' && metodo === 'PUT') {
    db.configuracion = { ...db.configuracion, ...body };
    auditar(db, admin, 'CONFIGURACION', 'Actualización de nombre/logo de la institución');
    guardarDb(db);
    return respuesta(db.configuracion);
  }

  if (metodo === 'GET' && ruta === '/admin/estadisticas') {
    return respuesta(calcularEstadisticas(db.hojasVida, db.usuarios, db.sedes, filtroDesdeParams(req)));
  }

  if (metodo === 'GET' && ruta === '/admin/hojas-vida') {
    const q = (req.params.get('q') ?? '').toLowerCase().trim();
    const estado = req.params.get('estado');
    const pagina = Math.max(1, Number(req.params.get('pagina') ?? 1));
    const tamano = Math.min(100, Math.max(1, Number(req.params.get('tamano') ?? 10)));
    let lista = filtrarHojas(db.hojasVida, db.sedes, filtroDesdeParams(req)).map((h) => resumenHoja(h, db.usuarios.find((u) => u.id === h.usuarioId)));
    if (q) lista = lista.filter((r) => `${r.nombreCompleto} ${r.documento} ${r.email} ${r.profesion ?? ''}`.toLowerCase().includes(q));
    if (estado) lista = lista.filter((r) => r.estado === estado);
    lista.sort((a, b) => b.fechaActualizacion.localeCompare(a.fechaActualizacion));
    auditar(db, admin, 'ADMIN_CONSULTA', `Listado de hojas de vida (filtro: ${q || 'ninguno'})`);
    guardarDb(db);
    return respuesta({ items: lista.slice((pagina - 1) * tamano, pagina * tamano), total: lista.length, pagina, tamano });
  }

  const mh = /^\/admin\/hojas-vida\/(\d+)$/.exec(ruta);
  if (mh && metodo === 'GET') {
    const hv = db.hojasVida.find((h) => h.id === Number(mh[1]));
    if (!hv) throw new ErrorApi(404, 'Hoja de vida no encontrada.');
    auditar(db, admin, 'ADMIN_VER_HV', `Consulta de hoja de vida #${hv.id}`);
    guardarDb(db);
    return respuesta(hv);
  }

  if (metodo === 'GET' && ruta === '/admin/usuarios') {
    const lista: UsuarioAdmin[] = db.usuarios.map((u) => ({
      id: u.id, nombres: u.nombres, apellidos: u.apellidos, email: u.email, rol: u.rol, activo: u.activo,
      fechaRegistro: u.fechaRegistro, ultimoAcceso: u.ultimoAcceso, tieneHojaVida: db.hojasVida.some((h) => h.usuarioId === u.id),
    }));
    return respuesta(lista);
  }
  const mu = /^\/admin\/usuarios\/(\d+)$/.exec(ruta);
  if (mu && metodo === 'PUT') {
    const u = db.usuarios.find((x) => x.id === Number(mu[1]));
    if (!u) throw new ErrorApi(404, 'Usuario no encontrado.');
    if (u.id === admin.id && (body['rol'] !== 'ADMIN' || body['activo'] === false)) {
      throw new ErrorApi(400, 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.');
    }
    if (body['rol'] === 'ADMIN' || body['rol'] === 'USUARIO') u.rol = body['rol'];
    if (typeof body['activo'] === 'boolean') u.activo = body['activo'];
    auditar(db, admin, 'ADMIN_USUARIO', `Usuario #${u.id}: rol=${u.rol}, activo=${u.activo}`);
    guardarDb(db);
    return respuesta({ id: u.id, rol: u.rol, activo: u.activo });
  }

  if (ruta === '/admin/sedes' && metodo === 'POST') {
    const id = String(body['id'] ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!id || db.sedes.some((s) => s.id === id)) throw new ErrorApi(409, 'El código de sede ya existe o no es válido.');
    const sede: Sede = { ...(body as Sede), id };
    db.sedes.push(sede);
    auditar(db, admin, 'ADMIN_SEDE', `Creación de sede ${id}`);
    guardarDb(db);
    return respuesta(sede, 201);
  }
  const ms = /^\/admin\/sedes\/([A-Z0-9-]+)$/.exec(ruta);
  if (ms) {
    const idx = db.sedes.findIndex((s) => s.id === ms[1]);
    if (idx < 0) throw new ErrorApi(404, 'Sede no encontrada.');
    if (metodo === 'PUT') {
      db.sedes[idx] = { ...(body as Sede), id: ms[1] };
      auditar(db, admin, 'ADMIN_SEDE', `Actualización de sede ${ms[1]}`);
      guardarDb(db);
      return respuesta(db.sedes[idx]);
    }
    if (metodo === 'DELETE') {
      if (db.hojasVida.some((h) => h.institucional?.sedeId === ms[1])) throw new ErrorApi(409, 'La sede tiene hojas de vida asociadas; desactívela en lugar de eliminarla.');
      db.sedes.splice(idx, 1);
      auditar(db, admin, 'ADMIN_SEDE', `Eliminación de sede ${ms[1]}`);
      guardarDb(db);
      return respuesta(null, 204);
    }
  }
  if (ruta === '/admin/sedes' && metodo === 'GET') return respuesta(db.sedes);

  if (metodo === 'GET' && ruta === '/admin/auditoria') {
    const pagina = Math.max(1, Number(req.params.get('pagina') ?? 1));
    const tamano = Math.min(100, Number(req.params.get('tamano') ?? 20));
    return respuesta({ items: db.auditoria.slice((pagina - 1) * tamano, pagina * tamano), total: db.auditoria.length, pagina, tamano });
  }

  void formData;
  throw new ErrorApi(404, `Ruta no encontrada: ${metodo} ${ruta}`);
}

function asignarIds(hv: HojaVida, db: MockDb): void {
  for (const lista of [hv.educacionSuperior, hv.idiomas, hv.experienciaLaboral] as { id?: number }[][]) {
    (lista ?? []).forEach((x) => { if (!x.id) x.id = ++db.seq; });
  }
}

/** Reinicia la base simulada (útil en pruebas). */
export function reiniciarMockDb(): void {
  dbMemoria = null;
  localStorage.removeItem(DB_KEY);
}

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMock || !req.url.startsWith(environment.apiUrl)) return next(req);
  return new Observable<HttpEvent<unknown>>((obs) => {
    from(procesar(req)).subscribe({
      next: (r) => { obs.next(r); obs.complete(); },
      error: (e: unknown) => {
        const status = e instanceof ErrorApi ? e.status : 500;
        const detail = e instanceof ErrorApi ? e.detail : 'Error interno del servidor simulado.';
        if (!(e instanceof ErrorApi)) console.error(e);
        obs.error(new HttpErrorResponse({ status, statusText: detail, error: { detail }, url: req.url }));
      },
    });
  }).pipe(delay(LATENCIA_MS));
};
