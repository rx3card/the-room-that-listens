# Investigación

Qué se miró, qué se aprendió y qué decisión concreta salió de cada cosa. Consultado el 31 de octubre de 2026.

## Referencias del brief

### Huluween: The Screamlands (Active Theory, 2020)

Fuentes: [ficha de Awwwards](https://www.awwwards.com/sites/huluween-the-screamlands) y el caso de estudio de Active Theory. Medium devolvió 403 y se leyó entero en [Internet Archive](https://web.archive.org/web/2022/https://medium.com/active-theory/huluween-the-screamlands-b1324f32ee7d).

Observado:

- Es un paseo lineal tipo atracción de feria: narrador, música y salas una tras otra. Las transiciones son continuas porque, según el estudio, los fundidos a negro «disminuirían la continuidad».
- Antes de producir hicieron storyboard de cada escena y un animatic de baja fidelidad.
- Timeline en Cinema 4D: los artistas animaban hasta los valores de shader sin pasar por código, y eso redujo errores.
- La luz viene horneada desde Octane en una sola muestra de textura. Encima añadieron «Geometry Lights», mezcla de forward y deferred, para las luces que parpadean.
- El cuello de botella fue el peso de las texturas. Lo resolvieron empaquetando roughness, oclusión y metalness en un RGB, y gris más normal XY en otro.
- Awwwards: 8,16 global, Animaciones/Transiciones 9,33, pero Accesibilidad 7,00 y Semántica 6,67.

Decisiones que tomamos:

- **Transiciones sin fundido a negro genérico.** Cada paso es un gesto físico distinto: entrar por el agujero, reventar la membrana, caer por la espiral, colapsar el horizonte.
- **Competimos donde flojea.** Su accesibilidad es la nota más baja; aquí es requisito de producto.
- **No copiamos:** su materia es el fandom de series y el grito. Aquí es lo contrario: silencio.
- **Limitación:** no tenemos horneado en Octane. Lo compensa elegir hormigón nocturno, que es muy agradecido con una sola luz, y escenas con una fuente principal.

### Equinox (Little Workshop)

Fuente: [ficha del estudio](https://www.littleworkshop.fr/projects/equinox/). Historia en primera persona con Three.js. Lo más valioso: se puede terminar **con un solo dedo** en móvil y sus controles están pensados para gente que no juega.

Decisión: navegación por nodos autorados con arrastre para mirar, sin WASD. Además nos deja controlar cada encuadre, y la composición no depende del jugador.

### Toom Archives, Aten7 (Immersive Garden)

Fuente: [ficha](https://immersive-g.com/projects/aten7/). Un templo metamórfico, alfabeto propio y línea temporal interactiva. La ficha no da detalles técnicos.

Decisión: el archivo es un lugar, no un apartado. De ahí que los créditos sean el «Registro de depósitos» dentro de la ficción.

### Black Hole Experience

Fuente: [Midnight](https://midnight.agency/work/black-hole). Secuencia PNG atada al scroll y modelo WebGL.

Decisión: descartada para el núcleo. Una secuencia pesa mucho y no reacciona al visitante, que es justo nuestra tesis. Tampoco usamos scroll.

### Paranormal Experience

El enlace del brief da 404 y no se encontró fuente alternativa verificable. No se usa como referencia.

### The Room That Listens: coincidencias

Búsqueda web sin coincidencia exacta. Hay muchos títulos llamados «The Room» en itch.io y la franquicia *The Room* de Fireproof. El nombre es usable pero poco buscable. Sigue siendo provisional y no se ha hecho comprobación de marcas.

## Material real que sostiene la idea

- **Espejos acústicos de Denge** (Kent, 1928 a 1930): cuencos de hormigón para oír aviones, dejados obsoletos por el radar en 1935. [Historic England](https://historicengland.org.uk/research/results/reports/96-1999), [RAF Denge](https://en.wikipedia.org/wiki/RAF_Denge). De aquí sale la arquitectura. Es la imagen menos usada del terror web y resuelve el pedido de que no sean pasillos oscuros.
- **I Am Sitting in a Room, Alvin Lucier** (1969): una sala que se come una voz hasta dejar solo sus resonancias. [Wikipedia](https://en.wikipedia.org/wiki/I_Am_Sitting_in_a_Room). Origen de que el lugar conserve voces.
- **Voder, Bell Labs** (1939): primera voz sintética electrónica, contemporánea de la ficción. Inspira el sintetizador de voz del proyecto.
- **Cóclea real:** la base responde a agudos y el ápice a graves. La espiral suena así de verdad.
- **Fonoautograma de 1860:** una voz grabada sin intención de reproducirse jamás. Dominio público.

## Tecnología

Versiones verificadas con `npm view` el 31 de octubre de 2026.

| Paquete | Versión | Licencia | Decisión |
| --- | --- | --- | --- |
| three | 0.187.0 | MIT | Usado |
| postprocessing | 6.39.5 | Zlib | Usado: bloom con mipmaps y un efecto propio de gradación |
| @react-three/fiber, drei | 9.8.2, 10.7.9 | MIT | Descartados: las escenas son imperativas y la UI no necesita React |
| gsap | 3.15.0 | Licencia propia sin coste, no OSI | Descartado: un tween de 25 líneas basta y deja todo el repositorio con licencias abiertas |
| howler | 2.2.4 | MIT | Descartado: necesitamos HRTF, convolución y filtros directos, y eso es Web Audio |
| theatre.js | no evaluado a fondo | | Descartado: sin artista de timeline, las rutas se escriben en código |
| xstate, zustand | 5.33.3, 5.0.16 | MIT | Descartados: un director de 100 líneas y datos planos alcanzan |
| WebGPU | | | Descartado por ahora: no aporta nada a estas escenas y excluiría móviles |

Web Audio: [MDN sobre espacialización](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics). `panningModel` se fija siempre a `HRTF` explícitamente porque las fuentes no coinciden en el valor por defecto.

## Recursos descartados

- `coastal_cliff_01` de Poly Haven: 865 000 polígonos y 15 MB de texturas. Se generó el acantilado por código.
- `Sea waves.wav` (CC BY-SA): el mar se sintetiza y queda sin obligaciones de copyleft.
- Voz por TTS neuronal (Piper): el entorno denegó ejecutar el binario descargado. Se sustituyó por un sintetizador propio, lo que además encaja mejor con la época.
- KTX2: no hay `toktx` en la máquina. Se usa WebP. Queda anotado en PERFORMANCE.md.

## Riesgos de imitación

- Un cuenco iluminado se parece a imágenes de Denge: por eso la estación es ficticia, no una recreación.
- El giro «la voz eres tú» tiene parientes en la ficción interactiva. Lo propio aquí es que se mide de verdad y que la curiosidad, no una elección explícita, es el acto dañino.

## Conclusiones de dirección

1. El sonido negado es el terror: ves el mar romper y no oyes nada, hasta un único final.
2. La frase del título con la señal en vivo es la identidad, y regresa al final cambiada.
3. Una luz por escena. Si no se justifica con una lámpara, no existe.
4. Todo lo que el lugar dice saber del visitante está medido.
