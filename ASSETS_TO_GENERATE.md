# Imágenes para generar con ChatGPT

**Estado: las once están generadas e integradas en `public/assets/plates/`.** Los originales están en `assets-src/plates/`. Este documento queda para regenerar alguna.

Cada una se proyecta sobre un encuadre fijo, como un matte painting de cine. La luz que parpadea, el polvo, la lluvia y las marcas interactivas siguen vivos encima.

**No hay que tocar código.** Si un archivo no existe, la escena usa el 3D en tiempo real.

## Cómo hacerlo

1. En ChatGPT, adjunta la imagen de referencia de `docs/plate-refs/`.
2. Pega el **bloque común** y después el prompt de esa imagen.
3. Pide formato horizontal 3:2 (1536 × 1024).
4. Guarda el resultado con el nombre indicado en `public/assets/plates/`. Formato `.webp`, o conviértelo:

```bash
magick resultado.png -quality 86 public/assets/plates/wax-floor.webp
```

5. Recarga la web. La imagen aparece sola al llegar a ese punto.

La composición tiene que respetarse: las marcas interactivas caen sobre los objetos de la referencia. Si ChatGPT mueve algo de sitio, pídele que lo devuelva a su posición.

Para mantener la coherencia, genera primero `headland-forecourt` y `wax-floor` y adjúntalos como referencia de estilo en las demás de su capítulo.

## Bloque común

Pégalo siempre antes del prompt.

```text
Edit the attached image. It is a rough 3D blockout: treat it as a strict layout guide.
Keep the exact camera, perspective, horizon, framing, and the position and size of every object.
Replace everything with a photorealistic still from a 1970s psychological horror film, shot on 35mm with a 40mm lens at low light.
One practical light source only. Real falloff, deep unlit blacks, soft halation around the flame or bulb, fine film grain.
Physically credible materials with age, dirt, water staining and wear.
Forbidden: text, letters, numbers, signatures, logos, watermarks, people, faces, hands, silhouettes of figures, skulls, monsters, blood, neon, purple glow, lens flares, HDR look, video game look, CGI look.
Aspect ratio 3:2, 1536x1024.
```

## Capítulo I: La sala

### `headland-forecourt.webp`

- **Propósito:** primera imagen de la estación. Tiene que dejar sin aliento por escala.
- **Referencia:** `docs/plate-refs/headland-forecourt.jpg`
- **Perspectiva:** contrapicado desde el patio, a altura de una persona.

```text
Night in heavy coastal rain. A gigantic 1931 concrete acoustic sound mirror, a parabolic dish thirty metres across, like the real Denge sound mirrors in Kent but larger, seen from below. Board-marked poured concrete with visible horizontal pour lines, long black rain streaks, lichen, rust bleeding from rebar. In front of it a thin tapered concrete pier with four battered fins rises to a small iron platform with one wooden chair and one bare caged lamp, which throws a pool of warm amber light into the bowl. The shadow of the pier and chair is cast huge on the concrete. The rest of the dish falls away into blue-black darkness. Wet cracked concrete forecourt below, reflecting faint amber. Low cloud lit almost imperceptibly by a hidden moon. Palette: blue-black #0B0B10, mineral grey #77747F, amber #FFAA55.
```

### `headland-seat.webp`

- **Propósito:** el momento de la primera Escucha.
- **Referencia:** `docs/plate-refs/headland-seat.jpg`
- **Perspectiva:** sentado en la silla, mirando al centro del cuenco.

```text
View from the listening seat, looking along a narrow rusted iron gantry with thin railings toward a closed circular iron shutter at the exact centre of a vast concrete bowl. Concentric pour rings in the concrete radiate from the shutter like the inside of an ear. Wet surfaces, rust dripping down the concrete, amber lamplight from behind the viewer falling off into darkness at the edges of the frame. Fine rain caught in the light. Oppressive, intimate, symmetrical. Palette: rust, amber #FFAA55, near black.
```

## Capítulo II: La grabación

### `wax-floor.webp`

- **Propósito:** plano maestro de la sala de cera.
- **Referencia:** `docs/plate-refs/wax-floor.jpg`
- **Perspectiva:** desde la entrada, cámara a la altura de los ojos.

```text
A round underground archive carved under rock, lit by one small oil lamp on a round wooden table. Curved dark wood shelving from floor to ceiling holds thousands of brown wax phonograph cylinders and cardboard tubes, each with a paper label too small to read. On the table a 1900s cylinder phonograph with a large tarnished brass horn that catches the flame. Worn plank floor with a soft pool of light. On the left wall a huge circular animal skin stretched in an iron ring, four metres across, dark and veined, like a drum head. At the right, a steel office desk and one wooden chair half lost in shadow. Dust hanging in the air. Everything beyond the lamp sinks into brown-black. Palette: amber #FFAA55, burnt umber, near black #050507.
```

### `wax-shelf.webp`

- **Referencia:** `docs/plate-refs/wax-shelf.jpg`

```text
Close view of old wooden shelves packed with brown and black wax phonograph cylinders standing on end, some in cardboard tubes, each with a small yellowed handwritten paper label whose writing is illegible scribble. Dust on the tops of the cylinders. Dim warm side light from the left, falling to black at the right. A vertical wooden upright. Museum archive long abandoned.
```

### `wax-desk.webp`

- **Referencia:** `docs/plate-refs/wax-desk.jpg`

```text
Looking down at a battered 1930s steel desk in near darkness. On it a large open ledger of ruled paper, a small notebook, and a single page cut from an old anatomy book. The writing is illegible scratches, never real letters. Weak amber light from one side. Stains, a ring from a cup, dust. A wooden chair pushed back at the edge of the frame.
```

### `wax-relay.webp`

- **Referencia:** `docs/plate-refs/wax-relay.jpg`

```text
A rusted iron panel set into a concrete wall. Three large bronze dials in a row, each with a single pale needle and no numerals, joined above by three small hinged bronze levers shaped like the bones of the middle ear: hammer, anvil, stirrup. Verdigris, grease, hand wear. One weak amber light from the left. Engineering object made with love and then abandoned.
```

### `wax-skin.webp`

- **Referencia:** `docs/plate-refs/wax-skin.jpg`

```text
A four-metre circular drum skin stretched tight in a heavy rusted iron ring, filling the frame, seen straight on. The skin is translucent old goat hide, dark brown and veined like an ear drum, with a very faint warm glow coming through its centre from behind. Iron bolts around the ring. Concrete wall around it. Deeply uncomfortable, organic, enormous.
```

### `wax-phonograph.webp`

- **Referencia:** `docs/plate-refs/wax-phonograph.jpg`

```text
Close view of an antique Edison cylinder phonograph on a wooden table beside a small oil lamp: dark wood base, a brown wax cylinder on the mandrel, a steel carriage, a hand crank at the right, and the throat of a tarnished brass horn. Shallow depth of field. The only warm thing in a black room.
```

## Capítulo III: La habitación imposible

No lleva imágenes. Los alambres son el 3D vivo y funcionan mejor así.

## Capítulo IV: El otro lado

### `other-shore.webp`

- **Propósito:** la imagen del cartel de la obra.
- **Referencia:** `docs/plate-refs/other-shore.jpg`

```text
Before dawn on a dead-still tide flat. Black mirror water, perfectly flat, with no horizon between sea and sky. Forty-one old wooden chairs stand in loose rows in ankle-deep water, all facing away from the viewer toward the dawn, each with a perfect dark reflection. Keep every chair exactly where it is in the reference. In the middle, a small desk with a burning lamp. In the far distance a black headland with the silhouette of a great concrete dish, and a thin line of deep red dawn. The upper sky goes to violet-black. No people. Absolute stillness. Palette: #050507, #261231, #55151D, one tiny point of #FFAA55.
```

### `other-rows.webp`

- **Referencia:** `docs/plate-refs/other-rows.jpg`

```text
Standing among rows of old wooden chairs in still black water before dawn. Worn paint, wet chair legs, dark reflections with no ripple. Ahead, a steel desk standing in the water with a typewriter-like stenographic machine and a small lamp making a pool of amber on a sheet of paper. Deep red horizon behind a black headland. Keep each chair in place. Palette: black, deep red #55151D, violet #261231, amber #FFAA55.
```

### `other-desk.webp`

- **Referencia:** `docs/plate-refs/other-desk.jpg`

```text
Close view from behind a steel desk standing in black water. On the desk a 1930s stenographic typewriter with a sheet of paper in the roller, the writing unreadable grey lines, never real letters. A small lamp on a thin stand. An old radio set at the left. The paper glows. Beyond the desk, darkness and water with one thin line of red dawn.
```

## Segunda tanda

Seis imágenes más, que cierran lo que la revisión independiente dejó abierto.

Para cada una de las cinco de la espiral:

1. Adjunta **dos imágenes**: su referencia de `docs/plate-refs/` y `public/assets/plates/headland-seat.webp`.
2. Pega el **bloque común**.
3. Pega debajo el prompt de esa imagen, tal cual.

Los prompts ya piden el túnel vacío: los alambres no se pintan, porque siguen vivos encima de la imagen.

### `spiral-s1.webp`

- **Referencia:** `docs/plate-refs/spiral-s1.jpg`
- **Propósito:** la entrada a la espiral, aún cálida.

```text
The second attached image is a style reference only: match its light, film look and material, not its composition. Inside a natural basalt spiral tunnel, two and a half metres wide, curving away to the left and downward. The rock has been lined with old board-marked concrete ribs every two metres, like the inside of a shell or a human cochlea. Wet walls, mineral stains. Faint warm light from behind the viewer dying within ten metres, then darkness around the bend. Palette: amber #FFAA55 fading to mineral grey #77747F and black. Empty corridor: no wires, no rods, no hair, nothing standing in it.
```

### `spiral-s2.webp`

- **Referencia:** `docs/plate-refs/spiral-s2.jpg`

```text
The second attached image is a style reference only: match its light, film look and material, not its composition. The same basalt spiral tunnel further in, colder. The curve to the left is tighter and the concrete ribs are closer together. In the right wall a narrow vertical slit opens onto darkness. Cold, weak light from an unseen source at waist height. Palette: blue-black #0B0B10, mineral grey #77747F. Empty corridor: no wires, no rods, no hair, nothing standing in it.
```

### `spiral-s3.webp`

- **Referencia:** `docs/plate-refs/spiral-s3.jpg`

```text
The second attached image is a style reference only: match its light, film look and material, not its composition. Deep in the same basalt spiral tunnel, narrower, the roof low and the bend sharp to the left. Water runs in a thin film down the wall. The ribs look like bone. The far end of the bend is completely black. Very low cold light. Palette: near black #050507, mineral grey #77747F. Empty corridor: no wires, no rods, no hair, nothing standing in it.
```

### `spiral-s4.webp`

- **Referencia:** `docs/plate-refs/spiral-s4.jpg`

```text
The second attached image is a style reference only: match its light, film look and material, not its composition. The narrowest part of the basalt spiral. The tunnel feels organic, closer to the inside of a body than a building. Ribs nearly touching, the floor curved like the walls. The tiniest thread of warm orange light comes from around the next bend. Palette: near black #050507, a trace of ember #FF6A00. Empty corridor: no wires, no rods, no hair, nothing standing in it.
```

### `spiral-s5.webp`

- **Referencia:** `docs/plate-refs/spiral-s5.jpg`
- **Propósito:** el final de la espiral. Tiene que ser un objeto, no un brillo.

```text
The second attached image is a style reference only: match its light, film look and material, not its composition. The end of the basalt spiral: the tunnel tapers to a real circular opening in the rock, about one metre across, with a worn rim like the mouth of a well. Warm orange light rises from deep beyond it, lighting the wet edge from inside and raking across the last ribs. The viewer feels the air pulling in. Palette: black, ember #FF6A00, amber #FFAA55. Empty corridor: no wires, no rods, no hair, nothing standing in it.
```

### `other-shore.webp` (sustituye a la actual)

- **Referencia:** `docs/plate-refs/other-shore.jpg`
- **Por qué:** en la orilla se ve un farol y un escritorio vacío, y en las dos siguientes vistas hay lámpara de cuello y máquina de escribir. Adjunta también `public/assets/plates/other-rows.webp` como referencia de continuidad.

Usa el prompt de `other-shore` de arriba y añade: `The small desk carries a typewriter and a gooseneck lamp, exactly as in the second attached image. The headland silhouette matches that image too.`

## Opcionales

Solo si te sobra tiempo. No son necesarios.

| Archivo | Uso | Prompt |
| --- | --- | --- |
| `public/og.jpg` (1200 × 630) | Portada para redes y GitHub | Reutiliza `other-shore` recortado |
| Escenas con personas | No generar | La obra no muestra nunca a nadie, y es deliberado |
