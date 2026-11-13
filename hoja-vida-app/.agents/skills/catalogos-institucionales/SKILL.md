---
name: catalogos-institucionales
description: Cómo actualizar sedes, regiones, programas, áreas SNIES o instituciones educativas de SIGEHV.
---
# Flujo: actualizar catálogos institucionales

- **Sedes**: preferiblemente desde la app (Administración → Sedes). Para la semilla, edita `SEDES_DEFECTO` en
  `src/app/core/constants/institucion.ts` (código, región, código DANE de departamento y municipio, lat/lng).
- **Programas**: `PROGRAMAS` en el mismo archivo. Cada programa debe tener `area` SNIES; de eso depende el
  indicador "docentes enfocados en su carrera".
- **Instituciones (IES)**: `INSTITUCIONES_EDUCATIVAS`; en producción, sincronizar con el SNIES desde la API.
- **Mapa**: `colombia-mapa.ts` se generó desde `@john-guerra/geo-colombia` (MIT); no editar a mano.
- Tras cambiar la semilla del mock, sube `DB_VERSION` en `mock-backend.interceptor.ts` para regenerar los datos.
