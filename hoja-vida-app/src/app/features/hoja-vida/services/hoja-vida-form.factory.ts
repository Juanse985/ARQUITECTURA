import { Injectable, inject } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { PAIS_COLOMBIA } from '../../../core/constants/catalogos';
import { REGEX } from '../../../core/constants/app.constants';
import {
  AreaConocimiento,
  ClaseLibreta,
  DatosPersonales,
  Declaracion,
  Duracion,
  EducacionSuperior,
  EstadoHojaVida,
  ExperienciaLaboral,
  HojaVida,
  HojaVidaPayload,
  Idioma,
  ModalidadAcademica,
  Nacionalidad,
  NivelIdioma,
  Sexo,
  TipoDocumento,
  TipoEntidad,
  TipoVinculacion,
  Ubicacion,
  OrigenHojaVida,
} from '../../../core/models';
import { HojaVidaParcial } from '../../../core/services/gemini.service';
import { ExperienciaCalculoService } from '../../../core/services/experiencia-calculo.service';
import { CustomValidators } from '../../../core/validators/custom-validators';
import { hoy, parseIsoDate, toIsoDate } from '../../../core/utils/date-utils';

/**
 * Fábrica del formulario reactivo de la hoja de vida.
 *
 * Construye UN SOLO FormGroup raíz con un sub-grupo por cada paso del stepper.
 * Centraliza: estructura, validaciones, reglas condicionales y la conversión
 * formulario <-> modelo (Date <-> 'yyyy-MM-dd').
 */
@Injectable({ providedIn: 'root' })
export class HojaVidaFormFactory {
  private readonly fb = inject(FormBuilder);
  private readonly calculo = inject(ExperienciaCalculoService);

  // ------------------------------------------------------------------ Bloques
  crearUbicacion() {
    const g = this.fb.group({
      pais: this.fb.control<string>(PAIS_COLOMBIA, { nonNullable: true, validators: Validators.required }),
      departamento: this.fb.control<string | null>(null, Validators.required),
      municipio: this.fb.control<string | null>(null, Validators.required),
    });
    // Fuera de Colombia el departamento (estado/provincia) es opcional.
    g.controls.pais.valueChanges.subscribe((pais) => {
      this.requerido(g.controls.departamento, pais === PAIS_COLOMBIA);
    });
    return g;
  }

  crearDatosPersonales() {
    const g = this.fb.group({
      primerApellido: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
      segundoApellido: this.fb.control<string | null>(null, Validators.maxLength(50)),
      nombres: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
      tipoDocumento: this.fb.control<TipoDocumento | null>(null, Validators.required),
      numeroDocumento: this.fb.control('', { nonNullable: true, validators: [Validators.required, CustomValidators.patron(REGEX.documento, 'documento')] }),
      sexo: this.fb.control<Sexo | null>(null, Validators.required),
      nacionalidad: this.fb.control<Nacionalidad>('COL', { nonNullable: true, validators: Validators.required }),
      paisNacionalidad: this.fb.control<string | null>(null),
      libretaMilitar: this.fb.group({
        clase: this.fb.control<ClaseLibreta | null>(null),
        numero: this.fb.control<string | null>(null, CustomValidators.patron(REGEX.soloNumeros, 'soloNumeros')),
        distritoMilitar: this.fb.control<string | null>(null, Validators.maxLength(10)),
      }),
      fechaNacimiento: this.fb.control<Date | null>(null, [Validators.required, CustomValidators.fechaNoFutura(), CustomValidators.edadMinima(14)]),
      lugarNacimiento: this.crearUbicacion(),
      direccionCorrespondencia: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
      ubicacionCorrespondencia: this.crearUbicacion(),
      telefono: this.fb.control('', { nonNullable: true, validators: [Validators.required, CustomValidators.patron(REGEX.telefono, 'telefono')] }),
      email: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      fotoUrl: this.fb.control<string | null>(null),
    });

    // Regla: si es extranjero, el país de nacionalidad es obligatorio.
    g.controls.nacionalidad.valueChanges.subscribe((n) => {
      this.requerido(g.controls.paisNacionalidad, n === 'EXT');
      if (n === 'COL') g.controls.paisNacionalidad.setValue(null, { emitEvent: false });
    });
    // Regla: la libreta militar solo aplica para sexo masculino.
    g.controls.sexo.valueChanges.subscribe((s) => {
      if (s !== 'M') g.controls.libretaMilitar.reset({ clase: null, numero: null, distritoMilitar: null }, { emitEvent: false });
    });
    return g;
  }

  /** Información institucional UNIMINUTO (tipo de vinculación, sede, programa, profesión). */
  crearInstitucional() {
    const g = this.fb.group({
      tipoVinculacion: this.fb.control<TipoVinculacion | null>(null, Validators.required),
      sedeId: this.fb.control<string | null>(null),
      programaId: this.fb.control<string | null>(null),
      profesion: this.fb.control<string | null>(null, Validators.maxLength(120)),
      areaConocimiento: this.fb.control<AreaConocimiento | null>(null),
    });
    // Regla: la sede es obligatoria salvo para aspirantes externos; el programa, para docentes/estudiantes/egresados.
    const aplicar = (t: TipoVinculacion | null) => {
      this.requerido(g.controls.sedeId, !!t && t !== 'EXTERNO');
      this.requerido(g.controls.programaId, t === 'DOCENTE' || t === 'ESTUDIANTE' || t === 'EGRESADO');
    };
    g.controls.tipoVinculacion.valueChanges.subscribe(aplicar);
    aplicar(null);
    return g;
  }

  crearEducacionBasica() {
    return this.fb.group({
      ultimoGrado: this.fb.control<number | null>(null, Validators.required),
      titulo: this.fb.control<string | null>(null, Validators.maxLength(120)),
      mesGrado: this.fb.control<number | null>(null),
      anioGrado: this.fb.control<number | null>(null),
    });
  }

  crearEducacionSuperior(e?: Partial<EducacionSuperior>) {
    const g = this.fb.group({
      id: this.fb.control<number | null>(e?.id ?? null),
      modalidad: this.fb.control<ModalidadAcademica | null>(e?.modalidad ?? null, Validators.required),
      semestresAprobados: this.fb.control<number | null>(e?.semestresAprobados ?? null, [Validators.required, Validators.min(0), Validators.max(20)]),
      graduado: this.fb.control<boolean | null>(e?.graduado ?? null, Validators.required),
      titulo: this.fb.control(e?.titulo ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
      institucion: this.fb.control<string | null>(e?.institucion ?? null, Validators.maxLength(150)),
      areaConocimiento: this.fb.control<AreaConocimiento | null>(e?.areaConocimiento ?? null),
      mesTerminacion: this.fb.control<number | null>(e?.mesTerminacion ?? null),
      anioTerminacion: this.fb.control<number | null>(e?.anioTerminacion ?? null),
      tarjetaProfesional: this.fb.control<string | null>(e?.tarjetaProfesional ?? null, Validators.maxLength(30)),
    });
    // Regla: si está graduado, la fecha de terminación (mes/año) es obligatoria.
    const aplicar = (graduado: boolean | null) => {
      this.requerido(g.controls.mesTerminacion, graduado === true);
      this.requerido(g.controls.anioTerminacion, graduado === true);
    };
    g.controls.graduado.valueChanges.subscribe(aplicar);
    aplicar(g.controls.graduado.value);
    return g;
  }

  crearIdioma(i?: Partial<Idioma>) {
    return this.fb.group({
      id: this.fb.control<number | null>(i?.id ?? null),
      idioma: this.fb.control(i?.idioma ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
      habla: this.fb.control<NivelIdioma | null>(i?.habla ?? null, Validators.required),
      lee: this.fb.control<NivelIdioma | null>(i?.lee ?? null, Validators.required),
      escribe: this.fb.control<NivelIdioma | null>(i?.escribe ?? null, Validators.required),
    });
  }

  crearFormacion() {
    return this.fb.group({
      educacionBasica: this.crearEducacionBasica(),
      educacionSuperior: this.fb.array<ReturnType<HojaVidaFormFactory['crearEducacionSuperior']>>([]),
      idiomas: this.fb.array<ReturnType<HojaVidaFormFactory['crearIdioma']>>([]),
    });
  }

  crearExperiencia(e?: Partial<ExperienciaLaboral>) {
    const g = this.fb.group(
      {
        id: this.fb.control<number | null>(e?.id ?? null),
        empresa: this.fb.control(e?.empresa ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
        tipoEntidad: this.fb.control<TipoEntidad | null>(e?.tipoEntidad ?? null, Validators.required),
        pais: this.fb.control<string>(e?.pais ?? PAIS_COLOMBIA, { nonNullable: true, validators: Validators.required }),
        departamento: this.fb.control<string | null>(e?.departamento ?? null, Validators.required),
        municipio: this.fb.control<string | null>(e?.municipio ?? null, Validators.required),
        correoEntidad: this.fb.control<string | null>(e?.correoEntidad ?? null, Validators.email),
        telefonos: this.fb.control<string | null>(e?.telefonos ?? null, Validators.maxLength(50)),
        fechaIngreso: this.fb.control<Date | null>(parseIsoDate(e?.fechaIngreso), [Validators.required, CustomValidators.fechaNoFutura()]),
        fechaRetiro: this.fb.control<Date | null>(parseIsoDate(e?.fechaRetiro), CustomValidators.fechaNoFutura()),
        empleoActual: this.fb.control<boolean>(e?.empleoActual ?? false, { nonNullable: true }),
        cargo: this.fb.control(e?.cargo ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
        dependencia: this.fb.control<string | null>(e?.dependencia ?? null, Validators.maxLength(120)),
        direccion: this.fb.control<string | null>(e?.direccion ?? null, Validators.maxLength(150)),
      },
      { validators: CustomValidators.rangoFechas('fechaIngreso', 'fechaRetiro') },
    );
    // Regla: "Empleo actual" desactiva la fecha de retiro; si no es actual, es obligatoria.
    const aplicar = (actual: boolean) => {
      const c = g.controls.fechaRetiro;
      if (actual) {
        c.setValue(null, { emitEvent: false });
        c.disable({ emitEvent: false });
      } else {
        c.enable({ emitEvent: false });
        c.setValidators([Validators.required, CustomValidators.fechaNoFutura()]);
        c.updateValueAndValidity({ emitEvent: false });
      }
    };
    g.controls.empleoActual.valueChanges.subscribe(aplicar);
    aplicar(g.controls.empleoActual.value);
    g.controls.pais.valueChanges.subscribe((p) => this.requerido(g.controls.departamento, p === PAIS_COLOMBIA));
    this.requerido(g.controls.departamento, g.controls.pais.value === PAIS_COLOMBIA);
    return g;
  }

  crearExperienciaLaboral() {
    return this.fb.group({
      items: this.fb.array<ReturnType<HojaVidaFormFactory['crearExperiencia']>>([], {
        validators: [CustomValidators.sinCruceFechas(), CustomValidators.unSoloEmpleoActual()],
      }),
    });
  }

  crearDuracion(d?: Duracion) {
    return this.fb.group({
      anios: this.fb.control<number>(d?.anios ?? 0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(70)] }),
      meses: this.fb.control<number>(d?.meses ?? 0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(11)] }),
    });
  }

  crearTiempo() {
    return this.fb.group({ independiente: this.crearDuracion() });
  }

  crearDeclaracion() {
    return this.fb.group({
      inhabilidad: this.fb.control<'SI' | 'NO' | null>(null, Validators.required),
      certificaVeracidad: this.fb.control(false, { nonNullable: true, validators: CustomValidators.aceptado() }),
      ciudadDiligenciamiento: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
      fechaDiligenciamiento: this.fb.control<Date | null>(hoy(), [Validators.required, CustomValidators.fechaNoFutura()]),
      firmaUrl: this.fb.control<string | null>(null),
      autorizaTratamientoDatos: this.fb.control(false, { nonNullable: true, validators: CustomValidators.aceptado() }),
    });
  }

  /** Formulario raíz: un sub-grupo por paso del stepper. */
  crearFormulario() {
    return this.fb.group({
      institucional: this.crearInstitucional(),
      datosPersonales: this.crearDatosPersonales(),
      formacion: this.crearFormacion(),
      experiencia: this.crearExperienciaLaboral(),
      tiempo: this.crearTiempo(),
      declaracion: this.crearDeclaracion(),
    });
  }

  // ------------------------------------------------------------------ Modelo -> Formulario
  cargar(form: HojaVidaForm, hv: HojaVida): void {
    if (hv.institucional) form.controls.institucional.patchValue(hv.institucional);
    const dp = hv.datosPersonales;
    if (dp) {
      form.controls.datosPersonales.patchValue({
        ...dp,
        fechaNacimiento: parseIsoDate(dp.fechaNacimiento),
      });
    }
    const f = form.controls.formacion.controls;
    if (hv.educacionBasica) f.educacionBasica.patchValue(hv.educacionBasica);
    f.educacionSuperior.clear();
    hv.educacionSuperior.forEach((e) => f.educacionSuperior.push(this.crearEducacionSuperior(e)));
    f.idiomas.clear();
    hv.idiomas.forEach((i) => f.idiomas.push(this.crearIdioma(i)));

    const items = form.controls.experiencia.controls.items;
    items.clear();
    hv.experienciaLaboral.forEach((e) => items.push(this.crearExperiencia(e)));

    if (hv.tiempoExperiencia) form.controls.tiempo.controls.independiente.patchValue(hv.tiempoExperiencia.independiente);

    if (hv.declaracion) {
      form.controls.declaracion.patchValue({
        ...hv.declaracion,
        fechaDiligenciamiento: parseIsoDate(hv.declaracion.fechaDiligenciamiento) ?? hoy(),
      });
    }
  }

  // ------------------------------------------------------------------ Formulario -> Modelo
  aPayload(form: HojaVidaForm, opciones: { omitirFoto?: boolean; omitirFirma?: boolean; origen?: OrigenHojaVida } = {}): HojaVidaPayload {
    const v = form.getRawValue();
    const dp = v.datosPersonales;
    const datosPersonales: DatosPersonales = {
      primerApellido: dp.primerApellido.trim(),
      segundoApellido: dp.segundoApellido?.trim() || null,
      nombres: dp.nombres.trim(),
      tipoDocumento: dp.tipoDocumento as TipoDocumento,
      numeroDocumento: dp.numeroDocumento.trim(),
      sexo: dp.sexo as Sexo,
      nacionalidad: dp.nacionalidad,
      paisNacionalidad: dp.nacionalidad === 'EXT' ? dp.paisNacionalidad : null,
      libretaMilitar: dp.sexo === 'M' ? dp.libretaMilitar : { clase: null, numero: null, distritoMilitar: null },
      fechaNacimiento: toIsoDate(dp.fechaNacimiento) ?? '',
      lugarNacimiento: dp.lugarNacimiento as Ubicacion,
      direccionCorrespondencia: dp.direccionCorrespondencia.trim(),
      ubicacionCorrespondencia: dp.ubicacionCorrespondencia as Ubicacion,
      telefono: dp.telefono.trim(),
      email: dp.email.trim(),
      fotoUrl: opciones.omitirFoto ? null : dp.fotoUrl,
    };

    const educacionSuperior = v.formacion.educacionSuperior.map(
      (e): EducacionSuperior => ({
        ...(e.id ? { id: e.id } : {}),
        modalidad: e.modalidad as ModalidadAcademica,
        semestresAprobados: Number(e.semestresAprobados ?? 0),
        graduado: !!e.graduado,
        titulo: e.titulo.trim(),
        institucion: e.institucion?.trim() || null,
        areaConocimiento: e.areaConocimiento,
        mesTerminacion: e.mesTerminacion,
        anioTerminacion: e.anioTerminacion,
        tarjetaProfesional: e.tarjetaProfesional?.trim() || null,
      }),
    );

    const idiomas = v.formacion.idiomas.map(
      (i): Idioma => ({
        ...(i.id ? { id: i.id } : {}),
        idioma: i.idioma.trim(),
        habla: i.habla as NivelIdioma,
        lee: i.lee as NivelIdioma,
        escribe: i.escribe as NivelIdioma,
      }),
    );

    const experienciaLaboral = v.experiencia.items.map(
      (e): ExperienciaLaboral => ({
        ...(e.id ? { id: e.id } : {}),
        empresa: e.empresa.trim(),
        tipoEntidad: e.tipoEntidad as TipoEntidad,
        pais: e.pais,
        departamento: e.departamento,
        municipio: e.municipio,
        correoEntidad: e.correoEntidad?.trim() || null,
        telefonos: e.telefonos?.trim() || null,
        fechaIngreso: toIsoDate(e.fechaIngreso) ?? '',
        fechaRetiro: e.empleoActual ? null : toIsoDate(e.fechaRetiro),
        empleoActual: e.empleoActual,
        cargo: e.cargo.trim(),
        dependencia: e.dependencia?.trim() || null,
        direccion: e.direccion?.trim() || null,
      }),
    );

    const d = v.declaracion;
    const declaracion: Declaracion = {
      inhabilidad: d.inhabilidad,
      certificaVeracidad: d.certificaVeracidad,
      ciudadDiligenciamiento: d.ciudadDiligenciamiento.trim(),
      fechaDiligenciamiento: toIsoDate(d.fechaDiligenciamiento) ?? '',
      firmaUrl: opciones.omitirFirma ? null : d.firmaUrl,
      autorizaTratamientoDatos: d.autorizaTratamientoDatos,
    };

    const estado: EstadoHojaVida = form.valid ? 'COMPLETA' : 'BORRADOR';

    const inst = v.institucional;
    return {
      estado,
      origen: opciones.origen ?? 'FORMULARIO',
      institucional: inst.tipoVinculacion
        ? {
            tipoVinculacion: inst.tipoVinculacion,
            sedeId: inst.sedeId,
            programaId: inst.programaId,
            profesion: inst.profesion?.trim() || null,
            areaConocimiento: inst.areaConocimiento,
          }
        : null,
      datosPersonales,
      educacionBasica: { ...v.formacion.educacionBasica, ultimoGrado: v.formacion.educacionBasica.ultimoGrado ?? 0 },
      educacionSuperior,
      idiomas,
      experienciaLaboral,
      tiempoExperiencia: this.calculo.calcular(experienciaLaboral, v.tiempo.independiente),
      declaracion,
    };
  }

  /** Vista previa: arma un objeto HojaVida a partir del formulario (sin guardar). */
  aVistaPrevia(form: HojaVidaForm, base: HojaVida | null): HojaVida {
    const p = this.aPayload(form, { origen: base?.origen });
    const ahora = new Date().toISOString();
    return {
      ...p,
      id: base?.id ?? 0,
      usuarioId: base?.usuarioId ?? 0,
      observacionesRrhh: base?.observacionesRrhh ?? null,
      archivoOriginal: base?.archivoOriginal ?? null,
      fechaCreacion: base?.fechaCreacion ?? ahora,
      fechaActualizacion: base?.fechaActualizacion ?? ahora,
    };
  }

  /**
   * Combina los datos extraídos por la IA con el formulario.
   * - modo 'vacios': solo llena los campos que están vacíos (no pisa lo que el usuario ya escribió).
   * - modo 'sobrescribir': reemplaza con lo que trae el archivo (cuando el dato viene).
   * Las listas (estudios, idiomas, experiencia) se AGREGAN evitando duplicados.
   * Devuelve cuántos campos/ítems se aplicaron.
   */
  combinar(form: HojaVidaForm, p: HojaVidaParcial, modo: 'vacios' | 'sobrescribir'): number {
    let aplicados = 0;
    const vacio = (v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v));
    const poner = (c: AbstractControl | null, valor: unknown) => {
      if (!c || vacio(valor)) return;
      if (modo === 'sobrescribir' || vacio(c.value)) {
        c.setValue(valor);
        c.markAsDirty();
        aplicados++;
      }
    };

    const dp = form.controls.datosPersonales.controls;
    const d = p.datosPersonales;
    if (d) {
      (['primerApellido', 'segundoApellido', 'nombres', 'tipoDocumento', 'numeroDocumento', 'sexo', 'direccionCorrespondencia', 'telefono', 'email'] as const)
        .forEach((k) => poner(dp[k], d[k]));
      if (d.nacionalidad === 'EXT') {
        poner(dp.nacionalidad, 'EXT');
        poner(dp.paisNacionalidad, d.paisNacionalidad);
      }
      poner(dp.fechaNacimiento, parseIsoDate(d.fechaNacimiento));
      if (d.sexo === 'M' || dp.sexo.value === 'M') {
        poner(dp.libretaMilitar.controls.clase, d.libretaMilitar.clase);
        poner(dp.libretaMilitar.controls.numero, d.libretaMilitar.numero);
        poner(dp.libretaMilitar.controls.distritoMilitar, d.libretaMilitar.distritoMilitar);
      }
      const ubic = (g: UbicacionForm, u: Ubicacion) => {
        if (!u.municipio && !u.departamento) return;
        if (modo === 'sobrescribir' || vacio(g.controls.municipio.value)) {
          g.controls.pais.setValue(u.pais);
          g.controls.departamento.setValue(u.departamento);
          g.controls.municipio.setValue(u.municipio);
          g.markAsDirty();
          aplicados++;
        }
      };
      ubic(dp.lugarNacimiento, d.lugarNacimiento);
      ubic(dp.ubicacionCorrespondencia, d.ubicacionCorrespondencia);
    }

    const inst = form.controls.institucional.controls;
    poner(inst.profesion, p.institucional?.profesion);
    poner(inst.areaConocimiento, p.institucional?.areaConocimiento);

    const eb = form.controls.formacion.controls.educacionBasica.controls;
    if (p.educacionBasica) {
      poner(eb.ultimoGrado, p.educacionBasica.ultimoGrado);
      poner(eb.titulo, p.educacionBasica.titulo);
      poner(eb.mesGrado, p.educacionBasica.mesGrado);
      poner(eb.anioGrado, p.educacionBasica.anioGrado);
    }

    const clave = (s: string | null | undefined) => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const sup = form.controls.formacion.controls.educacionSuperior;
    for (const e of p.educacionSuperior) {
      if (sup.controls.some((c) => clave(c.controls.titulo.value) === clave(e.titulo))) continue;
      sup.push(this.crearEducacionSuperior(e));
      aplicados++;
    }
    const idi = form.controls.formacion.controls.idiomas;
    for (const i of p.idiomas) {
      if (idi.controls.some((c) => clave(c.controls.idioma.value) === clave(i.idioma))) continue;
      idi.push(this.crearIdioma(i));
      aplicados++;
    }
    const exp = form.controls.experiencia.controls.items;
    for (const e of p.experienciaLaboral) {
      if (exp.controls.some((c) => clave(c.controls.empresa.value) === clave(e.empresa) && toIsoDate(c.controls.fechaIngreso.value) === e.fechaIngreso)) continue;
      // Si ya hay un empleo actual, el importado no puede serlo también.
      const yaActual = exp.controls.some((c) => c.controls.empleoActual.value);
      exp.push(this.crearExperiencia({ ...e, empleoActual: e.empleoActual && !yaActual }));
      aplicados++;
    }
    if (aplicados) form.markAsDirty();
    return aplicados;
  }

  /** Copia los id asignados por el servidor a los ítems nuevos del formulario. */
  sincronizarIds(form: HojaVidaForm, hv: HojaVida): void {
    const copiar = (arr: FormArray<FormGroup<{ id: FormControl<number | null> }>>, lista: { id?: number }[]) =>
      arr.controls.forEach((c, i) => {
        if (!c.controls.id.value && lista[i]?.id) c.controls.id.setValue(lista[i].id!, { emitEvent: false });
      });
    copiar(form.controls.formacion.controls.educacionSuperior as unknown as FormArray<FormGroup<{ id: FormControl<number | null> }>>, hv.educacionSuperior);
    copiar(form.controls.formacion.controls.idiomas as unknown as FormArray<FormGroup<{ id: FormControl<number | null> }>>, hv.idiomas);
    copiar(form.controls.experiencia.controls.items as unknown as FormArray<FormGroup<{ id: FormControl<number | null> }>>, hv.experienciaLaboral);
  }

  // ------------------------------------------------------------------ Utilidades
  private requerido(c: AbstractControl, requerido: boolean, extra: ValidatorFn[] = []): void {
    c.setValidators(requerido ? [Validators.required, ...extra] : extra);
    c.updateValueAndValidity({ emitEvent: false });
  }
}

// Tipos derivados de la fábrica (formularios fuertemente tipados).
export type HojaVidaForm = ReturnType<HojaVidaFormFactory['crearFormulario']>;
export type InstitucionalForm = ReturnType<HojaVidaFormFactory['crearInstitucional']>;
export type DatosPersonalesForm = ReturnType<HojaVidaFormFactory['crearDatosPersonales']>;
export type UbicacionForm = ReturnType<HojaVidaFormFactory['crearUbicacion']>;
export type FormacionForm = ReturnType<HojaVidaFormFactory['crearFormacion']>;
export type EducacionSuperiorForm = ReturnType<HojaVidaFormFactory['crearEducacionSuperior']>;
export type IdiomaForm = ReturnType<HojaVidaFormFactory['crearIdioma']>;
export type ExperienciaLaboralForm = ReturnType<HojaVidaFormFactory['crearExperienciaLaboral']>;
export type ExperienciaForm = ReturnType<HojaVidaFormFactory['crearExperiencia']>;
export type TiempoForm = ReturnType<HojaVidaFormFactory['crearTiempo']>;
export type DeclaracionForm = ReturnType<HojaVidaFormFactory['crearDeclaracion']>;
