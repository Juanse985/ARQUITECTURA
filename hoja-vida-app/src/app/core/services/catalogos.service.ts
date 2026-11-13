import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import * as C from '../constants/catalogos';
import { DEPARTAMENTOS, MUNICIPIOS } from '../constants/divipola';
import { Departamento, Municipio, OpcionCatalogo } from '../models/catalogo.model';
import { Ubicacion } from '../models/ubicacion.model';
import { toCamelCase } from '../utils/case-mapper';

/**
 * Catálogos de la aplicación.
 * - Catálogos fijos del formato: se leen de /core/constants.
 * - Departamentos y municipios: se consultan a la API (con caché) y, como
 *   respaldo síncrono para mostrar nombres, se usa la copia local DIVIPOLA.
 */
@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/catalogos`;
  private departamentos$?: Observable<Departamento[]>;
  private readonly cacheMunicipios = new Map<string, Observable<Municipio[]>>();

  readonly paisColombia = C.PAIS_COLOMBIA;
  readonly tiposDocumento = C.TIPOS_DOCUMENTO;
  readonly sexos = C.SEXOS;
  readonly nacionalidades = C.NACIONALIDADES;
  readonly clasesLibreta = C.CLASES_LIBRETA;
  readonly gruposGrados = C.GRUPOS_GRADOS;
  readonly modalidades = C.MODALIDADES_ACADEMICAS;
  readonly nivelesIdioma = C.NIVELES_IDIOMA;
  readonly tiposEntidad = C.TIPOS_ENTIDAD;
  readonly opcionesSiNo = C.OPCIONES_SI_NO;
  readonly opcionesInhabilidad = C.OPCIONES_INHABILIDAD;
  readonly meses = C.MESES;
  readonly paises = C.PAISES;
  readonly idiomasSugeridos = C.IDIOMAS_SUGERIDOS;
  readonly textos = {
    inhabilidad: C.TEXTO_DECLARACION_INHABILIDAD,
    certificacion: C.TEXTO_CERTIFICACION,
    tratamientoDatos: C.TEXTO_TRATAMIENTO_DATOS,
    certificacionRrhh: C.TEXTO_CERTIFICACION_RRHH,
  };

  /** Años disponibles para selects de mes/año (desde 1950 hasta el año actual). */
  readonly anios: number[] = Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i);

  getDepartamentos(): Observable<Departamento[]> {
    this.departamentos$ ??= this.http
      .get<unknown>(`${this.url}/departamentos`)
      .pipe(map((r) => toCamelCase<Departamento[]>(r)), shareReplay(1));
    return this.departamentos$;
  }

  getMunicipios(departamento: string | null): Observable<Municipio[]> {
    if (!departamento) return of([]);
    let obs = this.cacheMunicipios.get(departamento);
    if (!obs) {
      const params = new HttpParams().set('departamento', departamento);
      obs = this.http
        .get<unknown>(`${this.url}/municipios`, { params })
        .pipe(map((r) => toCamelCase<Municipio[]>(r)), shareReplay(1));
      this.cacheMunicipios.set(departamento, obs);
    }
    return obs;
  }

  /** Busca la etiqueta de una opción de catálogo. */
  etiqueta<T>(lista: OpcionCatalogo<T>[], valor: T | null | undefined, usarDescripcion = false): string {
    const op = lista.find((o) => o.valor === valor);
    if (!op) return '';
    return usarDescripcion ? (op.descripcion ?? op.etiqueta) : op.etiqueta;
  }

  nombreDepartamento(codigo: string | null | undefined): string {
    if (!codigo) return '';
    return DEPARTAMENTOS.find((d) => d.codigo === codigo)?.nombre ?? codigo;
  }

  nombreMunicipio(codigo: string | null | undefined): string {
    if (!codigo) return '';
    return MUNICIPIOS.find((m) => m.codigo === codigo)?.nombre ?? codigo;
  }

  /** Devuelve los nombres legibles de una ubicación (Colombia usa códigos DANE). */
  ubicacionLegible(u: Ubicacion | null | undefined): { pais: string; departamento: string; municipio: string } {
    if (!u) return { pais: '', departamento: '', municipio: '' };
    const col = u.pais === C.PAIS_COLOMBIA;
    return {
      pais: u.pais ?? '',
      departamento: col ? this.nombreDepartamento(u.departamento) : (u.departamento ?? ''),
      municipio: col ? this.nombreMunicipio(u.municipio) : (u.municipio ?? ''),
    };
  }
}
