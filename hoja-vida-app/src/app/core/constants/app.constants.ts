/** Formato de fecha colombiano usado en toda la aplicación. */
export const FORMATO_FECHA = 'dd/MM/yyyy';
export const LOCALE_APP = 'es-CO';

/** Número mínimo de filas que trae el formato impreso (la app permite más). */
export const FILAS_FORMATO = {
  educacionSuperior: 5,
  idiomas: 2,
  experiencia: 4,
} as const;

/** Clave del borrador local por usuario. */
export const BORRADOR_KEY = (usuarioId: number) => `sigehv_borrador_${usuarioId}`;

export const REGEX = {
  /** Mínimo 8 caracteres, al menos una mayúscula y un número. */
  password: /^(?=.*[A-Z])(?=.*\d).{8,}$/,
  telefono: /^[0-9+()\-\s]{7,20}$/,
  documento: /^[A-Za-z0-9]{3,20}$/,
  soloNumeros: /^\d+$/,
};
