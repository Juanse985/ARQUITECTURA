export type NivelIdioma = 'R' | 'B' | 'MB';

/** 2. FORMACIÓN ACADÉMICA - Idiomas diferentes al español */
export interface Idioma {
  id?: number;
  idioma: string;
  habla: NivelIdioma;
  lee: NivelIdioma;
  escribe: NivelIdioma;
}
