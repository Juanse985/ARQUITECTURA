---
trigger: model_decision
description: Conocimiento del dominio. Úsalo al tocar campos del Formato Único de Hoja de Vida, catálogos, sedes o estadísticas.
---
# Dominio: Formato Único de Hoja de Vida – Persona Natural

Secciones (respetar orden y nombres): 1 Datos personales · 2 Formación académica (básica y media 1º–11º,
educación superior con modalidades TC, TL, TE, UN, ES, MG, DOC, idiomas R/B/MB) · 3 Experiencia laboral
(actual + anteriores) · 4 Tiempo total de experiencia (servidor público, sector privado, independiente,
total) · 5 Firma y declaración de inhabilidades · 6 Observaciones de RR. HH. (solo lectura).

Extensiones institucionales (no se imprimen en el formato): tipo de vinculación (docente, estudiante,
egresado, administrativo, externo), sede, programa, profesión y área de conocimiento SNIES.
"Docente enfocado en su carrera" = tiene un título graduado en la misma área SNIES del programa donde enseña
(`core/utils/perfil-profesional.ts`).

Catálogos: `core/constants/catalogos.ts`, `divipola.ts` (DANE), `institucion.ts` (sedes, regiones,
programas de ejemplo, IES), `colombia-mapa.ts` (geometrías del mapa).
