---
name: The Room That Listens
description: Una historia de terror interactiva en el navegador; un corte anatómico de una estación de escucha y una transcripción de lo que hace quien la visita.
colors:
  ember: "#ff6a00"
  amber: "#ffaa55"
  violet: "#261231"
  blood: "#55151d"
  lamp: "#ffb27a"
  black: "#050507"
  coal: "#0b0b10"
  letterbox: "#000000"
  hairline: "#24232b"
  mineral: "#77747f"
  mute: "#b5b0ac"
  bone: "#e8e3dd"
  paper: "#dcd5c8"
  ink: "#15130f"
typography:
  poster:
    fontFamily: "'Host Grotesk Variable', system-ui, sans-serif"
    fontSize: "clamp(3rem, 7.8vw, 10rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  head:
    fontFamily: "'Host Grotesk Variable', system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.3rem + 3.2vw, 4rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  lead:
    fontFamily: "'Host Grotesk Variable', system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "'Host Grotesk Variable', system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.005em"
  record:
    fontFamily: "'Host Grotesk Variable', system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  action:
    fontFamily: "'Host Grotesk Variable', system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.005em"
  small:
    fontFamily: "'Host Grotesk Variable', system-ui, sans-serif"
    fontSize: "clamp(0.875rem, 0.84rem + 0.1vw, 0.9375rem)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.005em"
  typed:
    fontFamily: "'Courier Prime', 'Courier New', monospace"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
rounded:
  none: "0"
  round: "50%"
spacing:
  gutter: "clamp(16px, 2.2vw, 32px)"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.black}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "0.72em 1.15em"
  button-primary-hover:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.black}"
  button-quiet:
    backgroundColor: "{colors.coal}"
    textColor: "{colors.bone}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "0.72em 1.15em"
  button-quiet-hover:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.bone}"
  button-sheet:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "0.72em 1.15em"
  button-sheet-hover:
    backgroundColor: "{colors.blood}"
    textColor: "{colors.bone}"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "clamp(22px, 4vw, 44px)"
    width: "min(64ch, 100%)"
  sheet-typed:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.typed}"
    rounded: "{rounded.none}"
    padding: "clamp(22px, 4vw, 44px)"
    width: "min(64ch, 100%)"
  menu:
    backgroundColor: "{colors.coal}"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
    padding: "{spacing.gutter}"
    width: "min(420px, 100vw)"
  switch-on:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "0.4em 0.9em"
  spot-mark:
    rounded: "{rounded.round}"
    size: "15px"
  spot-mark-active:
    backgroundColor: "{colors.ember}"
    rounded: "{rounded.round}"
    size: "15px"
  hold-control:
    rounded: "{rounded.round}"
    size: "104px"
  crank-wheel:
    rounded: "{rounded.round}"
    size: "148px"
---

# Design System: The Room That Listens

## Overview

Estado: las dieciséis vistas pintadas están integradas. La última revisión dio fix: ninguna sala pide reconstrucción.

**Creative North Star: "El oído en sección"**

La pieza es un corte anatómico de un edificio de hormigón que funciona como un oído, acompañado de su registro taquigráfico. Sobre un fondo casi negro hay una sola voz tipográfica, una lámpara motivada en cada escena y un naranja que solo aparece cuando algo está vivo. La interfaz no decora la historia: la transcribe.

La densidad es mínima. Cada pantalla sostiene una frase grande o una imagen encuadrada y, al pie, el registro de lo ocurrido. El movimiento pertenece a la cámara, que tiene peso, respiración y paso; la interfaz casi no se mueve. La pantalla de título ya lo declara: una línea de señal real ocupa el lugar de una palabra, y lo que la pieza dice de quien la visita está medido. La ausencia también se diseña: una marca inalcanzable no se apaga, simplemente no existe.

Se rechazan la casa encantada de pasillo oscuro y la landing de Halloween, y el compromiso de marca excluye Halloween de fiesta, calaveras, monstruos decorativos, sustos repetidos y neón.

**Key Characteristics:**
- Negro casi puro, texto color hueso y acento reservado para lo vivo.
- Una sola familia neogrotesca, apretada, con Courier solo para la máquina de Ruano.
- Formato cinemático 2.39:1 con el registro dentro de la barra inferior.
- Rectángulos planos para leer y actuar; círculos solo para marcas y controles físicos.
- Movimiento de cámara con peso; la interfaz solo aparece y se desvanece.

## Colors

La paleta es la de Halloween del brief despojada de fiesta: casi negros, hueso cálido y dos naranjas de luz física, nunca todos a la vez.

### Primary
- **Ember** (#ff6a00): lo que está vivo. Marca activa, progreso del control de sostener, tímpano y posición en el plano, onda que pasa por la espiral y nombres tomados del registro final.
- **Amber** (#ffaa55): la respuesta y la voz. Hover y foco, voz de los muertos, frases de la manivela, señal cuando hay nivel real de micrófono y aviso de visita repetida.

### Secondary
- **Violet** (#261231): hover del botón discreto. No es un color de texto.
- **Blood** (#55151d): hover del botón sobre papel. Solo responde a una acción.

### Tertiary
- **Lamp** (#ffb27a): color físico de la lámpara principal en La sala, La grabación y El otro lado. Pertenece a la luz de escena, nunca a la interfaz.

### Neutral
- **Black** (#050507): fondo del título, los finales, el plano y los velos con alfa.
- **Coal** (#0b0b10): superficie elevada por tono. Menú, archivo, escenario de texto, botón discreto y campos.
- **Letterbox** (#000000): barras de cine y nada más; es negro puro, separado de Black.
- **Hairline** (#24232b): separador de filas en la tabla del archivo.
- **Mineral** (#77747f): pista inactiva de los controles circulares.
- **Mute** (#b5b0ac): texto secundario, avisos, leyendas e idioma inactivo.
- **Bone** (#e8e3dd): texto principal, botón primario, anillo de marca en reposo y señal en reposo.
- **Paper** (#dcd5c8): fondo de los documentos.
- **Ink** (#15130f): texto, tachaduras y botones sobre papel.

### Named Rules
**The Live Ember Rule.** Ember significa que algo está ocurriendo ahora o que el sistema lo registró como cierto. Nunca decora, nunca titula y nunca es el estado de reposo de un control.

**The Measured Signal Rule.** La señal es Bone mientras no haya medición, aunque ondule, y pasa a Amber solo cuando el micrófono mide nivel real (más de 0.02). Amber en la tira nunca se concede sin esa medición.

**The Not All At Once Rule.** Ninguna pantalla usa toda la paleta. Violet y Blood viven en estados de interacción, y la atmósfera de cada capítulo la aporta su propia luz.

## Typography

**Display Font:** Host Grotesk Variable (con system-ui, sans-serif)
**Body Font:** Host Grotesk Variable (con system-ui, sans-serif)
**Label/Mono Font:** Courier Prime (con Courier New, monospace), solo para documentos mecanografiados

**Character:** Una neogrotesca apretada que suena a sentencia cuando es enorme y a acta cuando es pequeña. Courier interrumpe esa voz única y delata una mano concreta.

### Hierarchy
- **Poster** (600, 3rem a 10rem con 7.8vw, 0.98): la frase de título, capítulos, fechas, finales y portada del archivo. En anchos de 760px o menos pasa a 2.6rem–6rem con 15vw en el título y 2.6rem–5rem con 13vw en los capítulos.
- **Head** (600, 2rem a 4rem, 1): títulos del menú, del archivo y de pantallas de texto.
- **Lead** (400, 1.25rem a 1.625rem, 1.3): subtítulo de entrada, voz, avisos y relato final; máximo de 34ch a 54ch según contexto.
- **Body** (400, 1.0625rem a 1.1875rem, 1.5): texto corrido, con 58ch a 64ch de medida.
- **Record** (400, tamaño de Body, 1.3): el registro al pie, hasta 72ch.
- **Action** (600, tamaño de Body, 1.5): etiquetas de botón.
- **Small** (400, 0.875rem a 0.9375rem, 1.45): metadatos, leyendas, nombres de marcas y controles secundarios.
- **Typed** (400, tamaño de Body, 1.5, tracking 0): documentos y transcripción de Ruano.

### Named Rules
**The Ruano's Machine Rule.** Courier Prime solo aparece en lo que salió de la máquina de Ruano: la caja, el libro, la carta y la transcripción. El parecido entre esos papeles es parte de la trama, así que usarlo para ambientar destruye una pista.

**The Tight Voice Rule.** El tracking se aprieta al crecer el tamaño, de -0.005em en Body a -0.04em en Poster. El peso solo salta de 400 a 600; no hay pesos intermedios en la jerarquía.

## Layout

El espacio se organiza como un encuadre de cine, no como una retícula de página. La variable de barra deriva de la proporción 2.39:1, con tope de 15dvh, y la imagen ocupa lo que queda. Todo lo que no es imagen se ancla al margen fluido, a un borde o al centro de la pantalla.

La interfaz flota sobre un lienzo fijo y no hay scroll de documento. Solo hacen scroll interno las superficies largas: título en pantallas bajas, documento, menú, archivo y final. Los controles de escena se apilan centrados y se referencian a la barra inferior, para dejar libre el registro. La lista de opciones va a la derecha y centrada en vertical.

En proporción vertical (1:1 o menos) la barra desaparece y el registro vuelve sobre la imagen con un velo neutro de 36dvh; los controles suben a 22dvh. En anchos de 760px o menos, la frase de título se rompe en líneas con la señal a ancho completo entre ellas, y los botones de entrada ocupan todo el ancho. En punteros gruesos los nombres de las marcas siempre están visibles, porque no existe hover.

El ritmo agrupa en 8–12px, separa bloques en 18–28px y da 56–72px entre secciones del archivo y del final.

## Elevation & Depth

La interfaz es plana: no hay `box-shadow` en ninguna superficie. La profundidad se logra con tono (Coal sobre Black), con velos de Black al 72–94 % sobre la imagen y con papel que interrumpe la oscuridad. La profundidad real pertenece al mundo 3D: niebla exponencial por escena, oclusión ambiental, bloom y un solo grado de color con curva tonal, viñeta y grano.

### Shadow Vocabulary
- **Halo de legibilidad** (`text-shadow: 0 0 18px #000`, con radios de 3px a 40px según tamaño): solo para texto sin caja sobre imagen 3D en vivo. Es una ayuda de lectura, no un efecto: en cuanto hay caja o barra, desaparece.

### Named Rules
**The One Motivated Lamp Rule.** Cada escena tiene una fuente principal física que justifica lo visible. Las luces de relleno, luna y hemisferio la sostienen a baja intensidad sin competir con ella; la espiral se reduce a la luz que sigue a quien camina y al trazo de la onda.

**The Physical Grade Rule.** Exposición, grano, franja cromática y fuga de luz se controlan desde un único grado. Sobre un grano base mínimo (0.012), los picos responden a hechos de la historia o a la Inclinación: grano de 0.3 en eventos y fuga ligada al progreso. Nada de esto se aplica a la interfaz.

**The Plate Over Blockout Rule.** Una placa de 3:2 cuelga delante de su nodo y cubre el 3D, mientras luz, polvo, lluvia y marcas siguen vivos. Sobre una placa el giro queda limitado a 0.14 y 0.08 rad, y salir de ella es un fundido por negro.

## Shapes

Hay dos formas y una razón para cada una. Todo rectángulo tiene esquinas vivas (radio 0), porque botones, paneles y hojas son objetos planos de archivo. El círculo (50 %) se reserva para lo que señala un punto o se opera con el cuerpo: marca, posición en el plano, control de sostener, manivela y su pomo. No hay bordes de contenedor; la frontera entre superficies la pone el tono. Las únicas líneas son trazos: el anillo de 1.5px, las pistas de 2–3px, el subrayado de 1px, el separador del archivo y el dibujo del plano.

## Components

### Buttons
Directos, planos y sin ceremonia.
- **Shape:** rectángulo de esquinas vivas (0).
- **Primary:** Bone con texto Black, peso 600 y relleno de 0.72em por 1.15em.
- **Hover / Focus:** pasa a Amber en 0.18s. El foco añade contorno Amber de 2px separado 3px. Al pulsar baja 1px.
- **Secondary / Ghost / Tertiary:** el discreto usa Coal y pasa a Violet. Sobre papel, el botón usa Ink y pasa a Blood. Los enlaces son texto Bone con subrayado de 1px que pasa a Amber.

### Cards / Containers
Superficies que interrumpen la escena, nunca tarjetas repetidas.
- **Corner Style:** esquinas vivas (0).
- **Background:** velo de Black al 93–94 % para diálogos, Coal para menú y archivo.
- **Shadow Strategy:** ninguna; ver Elevation & Depth.
- **Border:** ninguno.
- **Internal Padding:** 22–24px en diálogos y margen fluido en paneles completos.

### Inputs / Fields
- **Style:** sin borde. Las ruedas numéricas usan Coal, tamaño Lead y cifras tabulares. Selects y deslizadores del menú usan Black con acento Amber.
- **Focus:** contorno global Amber de 2px.
- **Error / Disabled:** no hay estilo propio en el sistema; no inventar uno sin que exista en el producto.

### Navigation
El menú es una columna derecha Coal de hasta 420px que entra 32px en 0.35s. Su activador es texto Small subrayado, centrado en la barra superior cuando esta existe. Los interruptores van de Black a Bone cuando están activos, y las filas miden al menos 48px. Los idiomas son texto; el activo sube a Bone y se subraya.

### Registro
La firma textual. Las líneas nuevas entran desde 6px en 0.9s, y las anteriores bajan a opacidad 0.6 en 2.4s. Vive en la barra inferior, alineado a la izquierda, hasta 72ch.

### Tira de señal
Trazo de 1.5px dibujado en vivo que ocupa el lugar de una palabra dentro de la frase. En reposo es casi plano, con una ondulación mínima, y responde al nivel medido, a la señal guardada de la visita o a un evento de la historia. Al final de la pieza su ganancia se apaga con la inactividad de quien mira.

### Marca
Hit area de 48px con un anillo Bone de 15px sobre un relleno translúcido, y una pulsación lenta de 3.6s, el único bucle CSS de la interfaz. Con hover o foco se llena de Ember, escala a 1.25 y muestra su nombre en Small sobre un velo oscuro. El lado del nombre se invierte si no cabe.

### Control de sostener
Círculo de 104px con pista Mineral y progreso Ember sobre el mismo aro. Funciona con puntero, Space o silencio real de micrófono. Mientras se sostiene, el fondo se tiñe de Ember al 14 %.

### Manivela
Rueda de 148px (124px en anchos pequeños) con pomo Bone de 22px y pista Mineral. La frase resultante aparece encima en Amber, tamaño Lead.

### Hoja
Papel centrado de hasta 64ch sobre un velo de Black al 72 %. Las hojas mecanografiadas heredan Courier, las tachaduras son bloques de Ink de 3.4em y los grabados usan multiplicar para fundirse con el papel.

### Plano del corte
Dibujo vectorial que hereda `currentColor`, con el vacío sustituible por superficie. Tiene mar discontinuo, roca al 12 %, cavidades y canal llenos con el fondo, tímpano en Ember y huesecillos de 3px. Es la misma pieza sobre papel y sobre negro, y su punto de posición de 14px es Ember.

## Do's and Don'ts

### Do:
- **Do** reserva Ember para lo vivo y lo registrado, y Amber para la respuesta y la voz, según **The Live Ember Rule**.
- **Do** ancla los controles de escena a la barra con `calc(var(--bar) + …)` y deja el registro sin obstruir.
- **Do** da a cada marca un área de 48px y a todo gesto una alternativa por teclado, como Space en el control de sostener.
- **Do** usa velos neutros y halos oscuros cuando el texto caiga sobre imagen viva; la legibilidad gana a la pureza.
- **Do** resuelve cada transición entre capítulos con cámara o fundido por exposición y respeta el modo de movimiento reducido, que reduce animaciones a 0.01ms y sustituye vuelos por fundidos.
- **Do** motiva cada escena con una fuente física visible, y acepta un clima propio por capítulo: niebla azul fría en La sala, ámbar en La grabación, azul casi negro en La habitación imposible y violeta con brillo carmesí en El otro lado.
- **Do** quita una marca inalcanzable por completo: la ausencia está diseñada.

### Don't:
- **Don't** uses Courier Prime fuera de los papeles de la máquina de Ruano.
- **Don't** añadas `box-shadow`, degradados decorativos ni bordes de contenedor a la interfaz. El velo vertical en pantallas verticales existe para leer el registro, no como estilo.
- **Don't** redondees rectángulos ni uses círculos para algo que no sea un punto o un control físico.
- **Don't** añadas flourish de interfaz: nada de rebotes, parallax decorativo o bucles aparte de la marca y la señal.
- **Don't** presentes como medido lo que no se midió: la frase o el color que afirmen algo de quien visita necesitan un dato real.
- **Don't** hagas clicable lo que no tiene consecuencia narrativa.
- **Don't** uses Halloween de fiesta, calaveras, monstruos decorativos, sustos repetidos, estroboscopia ni neón.
- **Don't** hagas depender un evento de un solo sentido: todo sonido tiene su equivalente en texto o imagen.
