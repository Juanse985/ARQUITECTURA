/**
 * Conversión de llaves entre camelCase (frontend TypeScript) y snake_case
 * (backend Python / FastAPI). Se aplica de forma recursiva a objetos y arreglos.
 *
 *  { primerApellido: 'Pérez' }  <->  { primer_apellido: 'Pérez' }
 */
type Json = unknown;

const esObjetoPlano = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  !(v instanceof Date) && !(v instanceof Blob) && !(v instanceof FormData);

export const camelToSnake = (s: string): string =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

export const snakeToCamel = (s: string): string =>
  s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function transformarLlaves(valor: Json, fn: (k: string) => string): Json {
  if (Array.isArray(valor)) {
    return valor.map((v) => transformarLlaves(v, fn));
  }
  if (esObjetoPlano(valor)) {
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [fn(k), transformarLlaves(v, fn)]),
    );
  }
  return valor;
}

export function toSnakeCase<T = unknown>(valor: unknown): T {
  return transformarLlaves(valor, camelToSnake) as T;
}

export function toCamelCase<T = unknown>(valor: unknown): T {
  return transformarLlaves(valor, snakeToCamel) as T;
}
