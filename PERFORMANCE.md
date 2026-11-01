# Rendimiento

## Cargas

| Pieza | Tamaño |
| --- | --- |
| JS inicial | 902 KB (277 KB gzip): Three.js, postprocesado y app |
| Cada escena | 4 a 10 KB, cargada al llegar |
| CSS | 17 KB |
| `public/assets` | 12M en total, cargados por capítulo |

El título no carga ninguna textura ni modelo: el trabajo empieza al pulsar entrar.

## Medido

Radeon 610M integrada, Brave headless con ANGLE sobre radeonsi, 1440 × 900, calidad BALANCED, escena ya estabilizada:

| Escena | FPS |
| --- | --- |
| Patio | 60 |
| Asiento | 24 |
| Sala de cera, estante, escritorio, membrana | 59 a 60 |
| Espiral, los cuatro nodos | 60 |
| Orilla, filas, escritorio final | 46 a 51 |

El asiento es el punto flojo: el cuenco llena la pantalla. La calidad automática lo compensa bajando resolución por debajo de 32 fps.

No se ha medido en un móvil físico. Las capturas de teléfono son emuladas sobre SwiftShader.

## Niveles de calidad

| | CINEMATIC | BALANCED | LITE |
| --- | --- | --- | --- |
| Resolución máxima | 2× | 1,25× | 1,5× |
| Sombras | 2048 | 1024 | No |
| Bloom y AO | Sí | Sí | No |
| MSAA | 4× | No | No |
| Alambres de la espiral | 22 000 | 11 000 | 4 200 |
| Cilindros | 16 000 | 16 000 | 7 500 |

LITE conserva toda la narrativa e interacciones. Prefiere más resolución y menos efectos, porque en un móvil se nota más lo primero.

## Decisiones

- Los mapas de sombra se renderizan una vez: las salas no se mueven y el parpadeo solo cambia intensidad.
- Geometría instanciada para cilindros, sillas y alambres.
- Alambres como cintas de ocho triángulos orientadas a cámara.
- Las escenas salientes liberan geometría y materiales.
- El ajuste automático baja primero resolución (hasta 0,8) y después de nivel.

## Pendiente

- KTX2 no se usó porque `toktx` no está instalado. Las texturas son WebP, que ocupan más memoria de GPU.
- Generar los planos añadirá unos 300 KB por imagen.
