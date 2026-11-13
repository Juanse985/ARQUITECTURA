export interface Duracion {
  anios: number;
  meses: number;
}

/** 4. TIEMPO TOTAL DE EXPERIENCIA */
export interface TiempoExperiencia {
  servidorPublico: Duracion;
  sectorPrivado: Duracion;
  independiente: Duracion;
  total: Duracion;
}
