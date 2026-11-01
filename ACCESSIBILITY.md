# Accesibilidad

## Cubierto

| Necesidad | Solución |
| --- | --- |
| Sin sonido | «Entrar en silencio» da la misma obra. Las voces llevan subtítulo y el registro describe lo sonoro |
| Sordera o hipoacusia | Ningún avance depende del oído. Un cilindro se puede completar leyendo sus palabras al girar |
| Sin micrófono | Mantener pulsado sustituye a la Escucha. Nunca es obligatorio pedir permiso |
| Sin WebGL | La historia entera como texto, con el mismo motor |
| Teclado | Tab, Enter, flechas, Espacio y Esc. Las marcas son botones reales |
| Un dedo | Toda la obra. La manivela también funciona manteniendo pulsado |
| Movimiento | Respeta `prefers-reduced-motion` y tiene ajuste propio: sustituye vuelos por fundidos |
| Pausa | Esc o Menú detienen imagen, audio y temporizadores |
| Lectores de pantalla | El registro es una región `role="log"`, y los documentos llevan nombre accesible |
| Idioma | Inglés y español completos, con `lang` actualizado |

## Decisiones de salud

- Sin destellos ni efectos estroboscópicos: la lámpara baja suavemente y nunca a menos del 72%.
- Sin sustos sonoros: limitador a -16 dB.
- Aviso de contenido adulto en la entrada: muerte, encierro, interrogatorios.

## Limitaciones conocidas

- El final «Punta Sorda» exige no actuar durante 41 segundos. Un lector de pantalla que genere eventos no lo impide, porque solo cuentan teclas, toques y movimientos grandes, pero no se ha probado con tecnologías de asistencia reales.
- Ninguna revisión se ha hecho con lectores de pantalla ni con personas con discapacidad.
- La oscuridad de varias escenas puede resultar difícil en pantallas con mucho reflejo.
