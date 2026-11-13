---
name: prueba-e2e
description: Prueba de extremo a extremo en el navegador de los flujos principales de SIGEHV (usuario, importación con IA, administrador).
---
# Flujo: prueba E2E manual o con el navegador del agente

Prepara: `npm start`, abre http://localhost:4200 y limpia el localStorage (`sigehv_mock_db`, `sigehv_token`).

**Usuario**
1. Registro con contraseña débil → errores; luego contraseña válida → entra al formulario.
2. Paso 1: vinculación (docente, sede, programa), datos personales, selects DANE en cascada. "Siguiente" se habilita solo si es válido.
3. Paso 2: estudio con "Graduado = Sí" exige mes/año; autocompletar de institución.
4. Paso 3: dos experiencias con fechas cruzadas → alerta y botón deshabilitado.
5. Paso 5: dibujar firma → Guardar → el Formato oficial muestra la firma.
6. Importar con IA: subir PDF/DOCX/imagen, autorizar, revisar y aplicar; el detalle muestra el archivo original.

**Administrador** (`admin@uniminuto.edu.co / Admin1234`)
7. Panel: indicadores, mapa (clic en sede y departamento filtra), docentes enfocados por programa.
8. Hojas de vida: búsqueda, paginación, ver detalle, exportar CSV.
9. Usuarios: otorgar/quitar rol; no puede desactivarse a sí mismo.
10. Configuración: cargar logo PNG → aparece en la barra superior y en el formato.
11. Auditoría: aparecen los eventos anteriores.

**Seguridad**: con el usuario demo, abrir `/admin` → redirige a `/inicio`.
