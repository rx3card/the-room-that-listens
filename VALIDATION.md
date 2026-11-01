# Validación

Ejecutado el 31 de octubre de 2026 en Arch Linux, Radeon 610M, Brave con Playwright sobre la build de producción.

## Pruebas automáticas

| Prueba | Resultado |
| --- | --- |
| TypeScript estricto | Sin errores |
| Vitest | 12 de 12. Incluye partidas completas sin navegador para los tres finales, ruta solo leyendo, claves EN/ES, registro de 41 nombres, voz |
| Playwright | 10 de 10 |
| `pnpm audit --prod` | Sin vulnerabilidades conocidas |
| Búsqueda de credenciales en `src`, `tools`, `tests` | Nada encontrado |

Playwright cubre: sin audio antes de un gesto, cambio y memoria de idioma, llegada al patio sin errores, partida completa nombrando a una persona, final por inacción, menú y archivo, guardado y reanudación, ruta sin WebGL, micrófono con dispositivo simulado, teléfono sin desbordamiento.

Tras esa pasada se tocó CSS y la lista de marcas en vertical. Se repitieron las cuatro pruebas de interfaz afectadas y pasaron.

La prueba del final por inacción salta directamente al escritorio del capítulo IV. El modo `?fast` acorta todos los tiempos, de modo que los 41 segundos reales no se han cronometrado de principio a fin.

## Filtros de diseño

| Herramienta | Resultado |
| --- | --- |
| Taste `lint.mjs` | 0 FAIL. Excepciones marcadas: sombra de texto y degradado neutro sobre imagen en vivo, por legibilidad |
| Taste `inspect.mjs` | 3 FAIL de reglas pensadas para páginas con scroll (pocas fotos, página quieta, título tardío). Este último destapó un error real de `pointer-events`, ya corregido. No se volvió a ejecutar tras corregirlo |
| Impeccable `detect` | Sin hallazgos |
| Impeccable, revisión final independiente | Segunda revisión, ya con las 11 vistas pintadas: **rebuild solo para la espiral**. Las salas con imagen pasan como materia creíble |

La primera revisión encontró defectos que se corrigieron: papeles sin texto, ámbar que viraba a limón, moteado en reposo, resolución baja en teléfono, contraste del registro y etiquetas cortadas. La segunda añadió lista de cilindros incompleta en teléfono, grano en reposo, marcas sobre nada y borde del velo inferior, también corregidos. No se ha repetido la revisión tras esas correcciones.

Quedan abiertos: las cinco vistas de la espiral y la continuidad de `other-shore`, listas en ASSETS_TO_GENERATE.md; las sillas caídas siguen siendo 3D sobre la pintura; y el asiento recuerda a una alcantarilla, cerca del pasillo oscuro que la tesis rechaza.

## Revisado por una persona o por capturas

Se miraron capturas de 14 momentos en 1440 × 900 y 390 × 844. Rendimiento en PERFORMANCE.md.

## Sin verificar

- **Sonido:** nadie lo ha escuchado. Solo se comprobó que no hay errores y que el contexto de audio respeta el gesto.
- **Voz de formantes:** se probó su salida numérica, no su inteligibilidad.
- **Micrófono real:** solo con dispositivo simulado.
- **Móvil físico y Safari:** no probados. El panel integrado bloquea el micrófono y las capturas son emuladas.
- **Lectores de pantalla:** no probados.
- **Memoria en sesiones largas:** no medida.
- **Procedencia embebida en imágenes:** `impeccable embed-prompt --scan` marca tres imágenes sin metadatos. Su origen sí consta en ASSET_SOURCES.md.

## Criterio final

| Pregunta | Respuesta honesta |
| --- | --- |
| ¿La historia funciona? | Sí. Es la parte más sólida |
| ¿Es original? | Sí |
| ¿Genera tensión? | Sobre el papel. Depende del sonido, sin comprobar |
| ¿Las decisiones importan? | Sí: cambian sillas, registro, finales y la siguiente visita |
| ¿Se entiende cómo avanzar? | Sí en las capturas; falta probarlo con alguien real |
| ¿Funciona en móvil? | En emulación |
| ¿Los escenarios están bien compuestos? | Sí en las once vistas pintadas. La espiral y los movimientos de cámara aún delatan el 3D |
| ¿Terminado? | La experiencia funciona de principio a fin. Falta la espiral pintada para cerrar la revisión visual |
