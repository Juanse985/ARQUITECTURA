/** 5. FIRMA DEL SERVIDOR PÚBLICO O CONTRATISTA */
export interface Declaracion {
  /** 'SI' = me encuentro dentro de las causales de inhabilidad; 'NO' = no me encuentro. */
  inhabilidad: 'SI' | 'NO' | null;
  certificaVeracidad: boolean;
  ciudadDiligenciamiento: string;
  fechaDiligenciamiento: string; // yyyy-MM-dd
  firmaUrl: string | null;
  autorizaTratamientoDatos: boolean;
}

/** 6. OBSERVACIONES DEL JEFE DE RECURSOS HUMANOS Y/O CONTRATOS (solo lectura) */
export interface ObservacionesRrhh {
  observaciones: string | null;
  firmaJefe: string | null;
  ciudad: string | null;
  fecha: string | null;
}
