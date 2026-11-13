/** Formato de error esperado desde FastAPI (HTTPException -> {"detail": ...}). */
export interface ApiError {
  detail: string | { loc: (string | number)[]; msg: string; type: string }[];
}

export interface ArchivoResponse {
  url: string;
}

export interface MensajeResponse {
  mensaje: string;
}
