import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DEPARTAMENTOS, MUNICIPIOS } from '../constants/divipola';
import { AREAS_CONOCIMIENTO, INSTITUCIONES_EDUCATIVAS } from '../constants/institucion';
import { PAISES } from '../constants/catalogos';
import {
  AreaConocimiento, EducacionSuperior, ExperienciaLaboral, FormatoArchivo, HojaVida, Idioma, ModalidadAcademica, NivelIdioma, Ubicacion,
} from '../models';
import { contexto } from '../interceptors/http-context.tokens';
import { InstitucionService } from './institucion.service';

/** Resultado de la extracción con IA: una hoja de vida PARCIAL para combinar con el formulario. */
export type HojaVidaParcial = Partial<Pick<HojaVida, 'datosPersonales' | 'educacionBasica' | 'institucional'>> & {
  educacionSuperior: EducacionSuperior[];
  idiomas: Idioma[];
  experienciaLaboral: ExperienciaLaboral[];
  camposEncontrados: number;
};

export const TIPOS_ARCHIVO_HV: Record<string, FormatoArchivo> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'image/png': 'IMAGEN',
  'image/jpeg': 'IMAGEN',
  'image/webp': 'IMAGEN',
  'text/plain': 'TEXTO',
};
export const TAMANO_MAX_HV = 5 * 1024 * 1024;
const CLAVE_SESION = 'sigehv_gemini_key';

const PROMPT = `Eres un asistente que extrae datos de hojas de vida colombianas para diligenciar el
"Formato Único de Hoja de Vida - Persona Natural" (Función Pública). Lee el documento adjunto
(puede ser PDF, imagen o texto de Word, en cualquier formato o diseño) y devuelve SOLO un JSON
válido con esta estructura. Usa null cuando un dato no aparezca. NO inventes datos.

{
  "datos_personales": {
    "primer_apellido": string|null, "segundo_apellido": string|null, "nombres": string|null,
    "tipo_documento": "CC"|"CE"|"PAS"|null, "numero_documento": string|null,
    "sexo": "F"|"M"|null, "nacionalidad": "COL"|"EXT"|null, "pais_nacionalidad": string|null,
    "libreta_militar": {"clase": "PRIMERA"|"SEGUNDA"|null, "numero": string|null, "distrito_militar": string|null},
    "fecha_nacimiento": "AAAA-MM-DD"|null,
    "lugar_nacimiento": {"pais": string|null, "departamento": string|null, "municipio": string|null},
    "direccion_correspondencia": string|null,
    "ubicacion_correspondencia": {"pais": string|null, "departamento": string|null, "municipio": string|null},
    "telefono": string|null, "email": string|null
  },
  "profesion": string|null,
  "area_conocimiento": "AGRO"|"ARTES"|"EDU"|"SALUD"|"SOCIALES"|"ECO"|"ING"|"MAT"|null,
  "educacion_basica": {"ultimo_grado": 1..11|null, "titulo": string|null, "mes_grado": 1..12|null, "anio_grado": number|null},
  "educacion_superior": [{
    "modalidad": "TC"|"TL"|"TE"|"UN"|"ES"|"MG"|"DOC", "semestres_aprobados": number|null, "graduado": boolean,
    "titulo": string, "institucion": string|null, "area_conocimiento": (mismos valores)|null,
    "mes_terminacion": number|null, "anio_terminacion": number|null, "tarjeta_profesional": string|null
  }],
  "idiomas": [{"idioma": string, "habla": "R"|"B"|"MB", "lee": "R"|"B"|"MB", "escribe": "R"|"B"|"MB"}],
  "experiencia_laboral": [{
    "empresa": string, "tipo_entidad": "PUBLICA"|"PRIVADA"|null, "pais": string|null, "departamento": string|null,
    "municipio": string|null, "correo_entidad": string|null, "telefonos": string|null,
    "fecha_ingreso": "AAAA-MM-DD"|null, "fecha_retiro": "AAAA-MM-DD"|null, "empleo_actual": boolean,
    "cargo": string|null, "dependencia": string|null, "direccion": string|null
  }]
}

Reglas: modalidad TC=técnica, TL=tecnológica, TE=tecnológica especializada, UN=universitaria/pregrado,
ES=especialización, MG=maestría, DOC=doctorado. Bachiller = último grado 11. Si solo hay mes y año en una
fecha, usa el día 01. Ordena la experiencia de la más reciente a la más antigua. Idiomas: excluye el español;
si dice "básico" usa R, "intermedio" B, "avanzado/nativo" MB. Entidades del Estado (alcaldías, ministerios,
gobernaciones, hospitales públicos, universidades públicas, SENA) son PUBLICA.`;

/**
 * Integración con Google Gemini para leer una hoja de vida en cualquier formato.
 *
 * ⚠️ MODO DEMOSTRACIÓN: el navegador llama directamente a la API de Gemini, por lo
 * que la API key queda expuesta a quien use el equipo. La key se pide al usuario y se
 * guarda solo en sessionStorage (se borra al cerrar la pestaña). En producción esta
 * llamada debe hacerse desde el backend FastAPI (POST /api/ia/extraer-hoja-vida) con la
 * key en variables de entorno del servidor. Ver docs/SEGURIDAD.md.
 */
@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly http = inject(HttpClient);
  private readonly institucion = inject(InstitucionService);
  private readonly base = 'https://generativelanguage.googleapis.com/v1beta';
  private modeloResuelto: string | null = null;

  tieneApiKey(): boolean {
    return !!this.apiKey();
  }

  guardarApiKeySesion(key: string): void {
    sessionStorage.setItem(CLAVE_SESION, key.trim());
  }

  olvidarApiKey(): void {
    sessionStorage.removeItem(CLAVE_SESION);
  }

  private apiKey(): string {
    return (environment as { geminiApiKey?: string }).geminiApiKey || sessionStorage.getItem(CLAVE_SESION) || '';
  }

  formatoDe(archivo: File): FormatoArchivo | null {
    return TIPOS_ARCHIVO_HV[archivo.type] ?? (archivo.name.toLowerCase().endsWith('.docx') ? 'DOCX' : null);
  }

  /** Lee el archivo, lo envía a Gemini y devuelve los datos normalizados. */
  async extraer(archivo: File): Promise<HojaVidaParcial> {
    const formato = this.formatoDe(archivo);
    if (!formato) throw new Error('Formato no soportado. Use PDF, Word (.docx), JPG, PNG o TXT.');
    if (archivo.size > TAMANO_MAX_HV) throw new Error('El archivo supera 5 MB.');

    const parts: unknown[] = [{ text: PROMPT }];
    if (formato === 'DOCX') {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ arrayBuffer: await archivo.arrayBuffer() });
      parts.push({ text: `HOJA DE VIDA (texto extraído de Word):\n${value.slice(0, 60000)}` });
    } else if (formato === 'TEXTO') {
      parts.push({ text: `HOJA DE VIDA:\n${(await archivo.text()).slice(0, 60000)}` });
    } else {
      parts.push({ inline_data: { mime_type: archivo.type, data: await this.base64(archivo) } });
    }

    const respuesta = await this.generar(parts);
    const texto = respuesta?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    let json: Record<string, any>;
    try {
      json = JSON.parse(texto.replace(/^```(json)?/i, '').replace(/```$/, '').trim());
    } catch {
      throw new Error('La IA no devolvió datos legibles. Intenta con otro archivo o con mejor calidad de imagen.');
    }
    return this.normalizar(json);
  }

  // ------------------------------------------------------------------ Llamada HTTP
  private async generar(parts: unknown[]): Promise<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }> {
    const key = this.apiKey();
    if (!key) throw new Error('Falta la API key de Gemini.');
    const cuerpo = { contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } };
    const opciones = { headers: { 'x-goog-api-key': key }, context: contexto({ sinAlerta: true }) };
    const modelo = this.modeloResuelto ?? this.institucion.config().modeloIa ?? 'gemini-3.8-flash';
    try {
      return await firstValueFrom(this.http.post<any>(`${this.base}/models/${modelo}:generateContent`, cuerpo, opciones));
    } catch (e) {
      const err = e as HttpErrorResponse;
      // Si el modelo configurado no existe, se busca uno "flash" disponible para la key.
      if (err.status === 404 && !this.modeloResuelto) {
        this.modeloResuelto = await this.buscarModeloDisponible(key);
        return firstValueFrom(this.http.post<any>(`${this.base}/models/${this.modeloResuelto}:generateContent`, cuerpo, opciones));
      }
      if (err.status === 400 || err.status === 403) throw new Error('La API key de Gemini no es válida o no tiene permisos. Verifícala en Google AI Studio.');
      if (err.status === 429) throw new Error('Se alcanzó el límite de uso de Gemini. Intenta más tarde.');
      throw new Error(err.error?.error?.message ?? 'No fue posible comunicarse con Gemini.');
    }
  }

  private async buscarModeloDisponible(key: string): Promise<string> {
    const r = await firstValueFrom(
      this.http.get<{ models: { name: string; supportedGenerationMethods?: string[] }[] }>(`${this.base}/models`, {
        headers: { 'x-goog-api-key': key }, context: contexto({ sinAlerta: true }),
      }),
    );
    const aptos = r.models.filter((m) => m.supportedGenerationMethods?.includes('generateContent'));
    const flash = aptos.filter((m) => /flash/.test(m.name) && !/lite|image|tts|live|audio/.test(m.name)).map((m) => m.name.replace('models/', ''));
    const elegido = flash.sort().reverse()[0] ?? aptos[0]?.name.replace('models/', '');
    if (!elegido) throw new Error('No hay modelos de Gemini disponibles para esta API key.');
    return elegido;
  }

  private base64(f: Blob): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] ?? '');
      r.onerror = () => rej(r.error);
      r.readAsDataURL(f);
    });
  }

  // ------------------------------------------------------------------ Normalización
  private normalizar(j: Record<string, any>): HojaVidaParcial {
    let encontrados = 0;
    const txt = (v: unknown, max = 150): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).replace(/[<>]/g, '').trim().slice(0, max);
      if (s) encontrados++;
      return s || null;
    };
    const uno = <T extends string>(v: unknown, permitidos: readonly T[]): T | null => {
      const s = String(v ?? '').toUpperCase().trim() as T;
      if (permitidos.includes(s)) { encontrados++; return s; }
      return null;
    };
    const num = (v: unknown, min: number, max: number): number | null => {
      const n = Number(v);
      return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
    };
    const fecha = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? (encontrados++, v) : null);
    const area = (v: unknown) => uno<AreaConocimiento>(v, AREAS_CONOCIMIENTO.map((a) => a.valor));

    const dp = j['datos_personales'] ?? {};
    const nacionalidad = uno(dp.nacionalidad, ['COL', 'EXT'] as const);
    const parcial: HojaVidaParcial = {
      datosPersonales: {
        primerApellido: txt(dp.primer_apellido, 50) ?? '',
        segundoApellido: txt(dp.segundo_apellido, 50),
        nombres: txt(dp.nombres, 80) ?? '',
        tipoDocumento: uno(dp.tipo_documento, ['CC', 'CE', 'PAS'] as const) ?? (null as never),
        numeroDocumento: (txt(dp.numero_documento, 20) ?? '').replace(/[^A-Za-z0-9]/g, ''),
        sexo: uno(dp.sexo, ['F', 'M'] as const) ?? (null as never),
        nacionalidad: nacionalidad ?? 'COL',
        paisNacionalidad: nacionalidad === 'EXT' ? this.pais(dp.pais_nacionalidad) : null,
        libretaMilitar: {
          clase: uno(dp.libreta_militar?.clase, ['PRIMERA', 'SEGUNDA'] as const),
          numero: (txt(dp.libreta_militar?.numero, 20) ?? '').replace(/\D/g, '') || null,
          distritoMilitar: txt(dp.libreta_militar?.distrito_militar, 10),
        },
        fechaNacimiento: fecha(dp.fecha_nacimiento) ?? '',
        lugarNacimiento: this.ubicacion(dp.lugar_nacimiento),
        direccionCorrespondencia: txt(dp.direccion_correspondencia) ?? '',
        ubicacionCorrespondencia: this.ubicacion(dp.ubicacion_correspondencia),
        telefono: (txt(dp.telefono, 20) ?? '').replace(/[^0-9+()\-\s]/g, ''),
        email: (txt(dp.email, 120) ?? '').toLowerCase(),
        fotoUrl: null,
      },
      institucional: { tipoVinculacion: 'EXTERNO', sedeId: null, programaId: null, profesion: txt(j['profesion'], 120), areaConocimiento: area(j['area_conocimiento']) },
      educacionBasica: j['educacion_basica']
        ? {
            ultimoGrado: num(j['educacion_basica'].ultimo_grado, 1, 11) ?? (null as never),
            titulo: txt(j['educacion_basica'].titulo, 120),
            mesGrado: num(j['educacion_basica'].mes_grado, 1, 12),
            anioGrado: num(j['educacion_basica'].anio_grado, 1940, 2100),
          }
        : undefined,
      educacionSuperior: (Array.isArray(j['educacion_superior']) ? j['educacion_superior'] : []).slice(0, 15).map((e: any) => ({
        modalidad: (uno(e.modalidad, ['TC', 'TL', 'TE', 'UN', 'ES', 'MG', 'DOC'] as const) ?? 'UN') as ModalidadAcademica,
        semestresAprobados: num(e.semestres_aprobados, 0, 20) ?? (e.graduado ? (e.modalidad === 'UN' ? 10 : e.modalidad === 'TL' ? 6 : 2) : 0),
        graduado: e.graduado === true,
        titulo: txt(e.titulo) ?? '',
        institucion: this.institucionConocida(e.institucion),
        areaConocimiento: area(e.area_conocimiento),
        mesTerminacion: num(e.mes_terminacion, 1, 12),
        anioTerminacion: num(e.anio_terminacion, 1940, 2100),
        tarjetaProfesional: txt(e.tarjeta_profesional, 30),
      })).filter((e: EducacionSuperior) => e.titulo),
      idiomas: (Array.isArray(j['idiomas']) ? j['idiomas'] : []).slice(0, 10).map((i: any) => ({
        idioma: txt(i.idioma, 50) ?? '',
        habla: (uno(i.habla, ['R', 'B', 'MB'] as const) ?? 'R') as NivelIdioma,
        lee: (uno(i.lee, ['R', 'B', 'MB'] as const) ?? 'R') as NivelIdioma,
        escribe: (uno(i.escribe, ['R', 'B', 'MB'] as const) ?? 'R') as NivelIdioma,
      })).filter((i: Idioma) => i.idioma && !/espa[nñ]ol|castellano/i.test(i.idioma)),
      experienciaLaboral: (Array.isArray(j['experiencia_laboral']) ? j['experiencia_laboral'] : []).slice(0, 20).map((e: any, k: number) => {
        const u = this.ubicacion({ pais: e.pais, departamento: e.departamento, municipio: e.municipio });
        const actual = e.empleo_actual === true && k === 0;
        return {
          empresa: txt(e.empresa) ?? '', tipoEntidad: uno(e.tipo_entidad, ['PUBLICA', 'PRIVADA'] as const) ?? (null as never),
          pais: u.pais, departamento: u.departamento, municipio: u.municipio,
          correoEntidad: txt(e.correo_entidad, 120), telefonos: txt(e.telefonos, 50),
          fechaIngreso: fecha(e.fecha_ingreso) ?? '', fechaRetiro: actual ? null : fecha(e.fecha_retiro),
          empleoActual: actual, cargo: txt(e.cargo, 120) ?? '', dependencia: txt(e.dependencia, 120), direccion: txt(e.direccion),
        };
      }).filter((e: ExperienciaLaboral) => e.empresa),
      camposEncontrados: 0,
    };
    parcial.camposEncontrados = encontrados;
    return parcial;
  }

  private norm(s: unknown): string {
    return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private pais(v: unknown): string | null {
    const n = this.norm(v);
    if (!n) return null;
    return PAISES.find((p) => this.norm(p) === n) ?? 'Otro';
  }

  /** Convierte nombres de departamento/municipio a códigos DANE (para los selects en cascada). */
  private ubicacion(u: any): Ubicacion {
    const pais = this.pais(u?.pais) ?? 'Colombia';
    if (pais !== 'Colombia') return { pais, departamento: u?.departamento ? String(u.departamento).slice(0, 80) : null, municipio: u?.municipio ? String(u.municipio).slice(0, 80) : null };
    const nd = this.norm(u?.departamento).replace(/^(departamento del?|depto)\s+/, '');
    let dep = DEPARTAMENTOS.find((d) => this.norm(d.nombre) === nd || (nd.length > 3 && this.norm(d.nombre).startsWith(nd)));
    const nm = this.norm(u?.municipio);
    if (nm.includes('bogota')) dep = DEPARTAMENTOS.find((d) => d.codigo === '11');
    const candidatos = MUNICIPIOS.filter((m) => this.norm(m.nombre) === nm || (nm.includes('bogota') && m.codigo === '11001'));
    const mun = candidatos.find((m) => !dep || m.departamento === dep.codigo) ?? (dep ? undefined : candidatos[0]);
    if (!dep && mun) dep = DEPARTAMENTOS.find((d) => d.codigo === mun.departamento);
    return { pais: 'Colombia', departamento: dep?.codigo ?? null, municipio: mun?.codigo ?? null };
  }

  private institucionConocida(v: unknown): string | null {
    const n = this.norm(v);
    if (!n) return null;
    const ies =
      INSTITUCIONES_EDUCATIVAS.find((i) => this.norm(i.nombre) === n || (i.sigla && this.norm(i.sigla) === n)) ??
      INSTITUCIONES_EDUCATIVAS.find((i) => n.length >= 4 && this.norm(i.nombre).split(' ').includes(n));
    return ies?.nombre ?? String(v).slice(0, 150);
  }
}
