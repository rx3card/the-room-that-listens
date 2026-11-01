# Diseño sonoro

La idea central: **el sonido que se niega**. Ves el mar romper contra el cabo y no lo oyes. Ese mar solo vuelve en un final, el único en el que dejas de escuchar.

## Capas por escena

| Escena | Sala (reverberación) | Capas |
| --- | --- | --- |
| La llamada | Casi nula, «sorda» | Mar real, viento sintético. El mar cae a cero al llegar a la costa |
| I. La sala | Casi nula | Lluvia real, drone de 41 Hz, zumbido de lámpara posicionado en el pilar. Con las copas puestas: filtro de paso bajo y grabación de Sullivan de 1888 |
| II. La grabación | 1,7 s, cálida | Drone triangular, «Feeling Watched», voces de 1890 posicionadas tras los estantes, casi inaudibles |
| III. Espiral | 5,5 s, inmensa | Banda estrecha que baja de 3,2 kHz a 160 Hz según avanzas, como una cóclea, «Sensory Deprivation», pasos reales en HRTF |
| IV. El otro lado | 3,4 s, oscura | Viento real de Marte a 0,7 de velocidad, «Perceptual Isolation», drone de 33 Hz |
| Última señal | Casi nula | Fonoautograma de 1860 ralentizado, muy bajo |

## La Escucha

Todas las capas ambientales caen en 80 ms a un 2%. Es el evento de terror de la obra: no un sonido, sino su retirada. Vuelven en más de un segundo.

## Sustos

No hay. Un limitador a -16 dB impide picos, y ningún evento supera ese techo. Tras cada cilindro suena una puerta lejana, posicionada a la espalda y a poco volumen: es la muerte de esa persona y casi nadie lo sabrá la primera vez.

## Voces

`src/audio/voder.ts` es un sintetizador de formantes escrito para este proyecto, a la manera del Voder de Bell Labs (1939). No es inteligible sin ayuda, y es deliberado: con el subtítulo delante, el cerebro oye las palabras, igual que en la psicofonía. Cada línea tiene una versión fonética para inglés y otra para español en `text.ts`.

Se intentó usar voz neuronal (Piper), pero el entorno bloqueó ejecutar ese binario. Una voz humana grabada o generada mejoraría los cilindros: basta con cambiar `crankStart` para que cargue un archivo.

## Sin sonido

Todo evento sonoro tiene equivalente en texto o imagen. Las voces tienen subtítulo, y el registro describe lo que no se oye. En silencio, los tiempos son idénticos.

## Sin verificar

El sonido se ha comprobado por código y por pruebas, pero nadie lo ha escuchado en esta build. Los niveles relativos de música, mar y voces necesitan una pasada con oídos reales. Se ajustan en `AudioEngine.ambience`.
