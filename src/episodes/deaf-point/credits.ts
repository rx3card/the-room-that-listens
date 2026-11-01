// Shown in Archives & Credits. Keep in step with ASSET_SOURCES.md.
export interface Credit {
  title: string
  by: string
  licence: string
  url: string
}

const ph = (id: string) => `https://polyhaven.com/a/${id}`
const wc = (f: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`

export const recordings: Credit[] = [
  { title: 'Au clair de la lune, phonautogram, 1860', by: 'Édouard-Léon Scott de Martinville; restored by First Sounds', licence: 'Public domain', url: wc('1860-Scott-Au-Clair-de-la-Lune-05-09.ogg') },
  { title: 'Tchaikovsky, Anton Rubinstein and friends, cylinder, 1890', by: 'Julius Block', licence: 'Public domain', url: wc('Tchaikowsky & Anton Rubinstein & friends(1890).ogg') },
  { title: 'Arthur Sullivan, cylinder, 1888', by: 'George Gouraud', licence: 'Public domain', url: wc('Arthur Sullivan - wax cylinder recording.ogg') },
  { title: 'Wind on Mars, recorded by Perseverance SuperCam, 2021', by: 'NASA/JPL-Caltech/LANL/CNES/IRAP', licence: 'Public domain', url: wc("Perseverance rover's SuperCam records wind on Mars.oga") },
  { title: 'Sea waves', by: 'Ganesh Mohan T', licence: 'CC BY-SA 4.0', url: wc('Sea waves.wav') },
  { title: 'Rain on a veranda', by: 'ezwa', licence: 'Public domain', url: wc('Rain on a veranda and t.ogg') },
  { title: 'Pasos en escalera de caracol', by: 'Hippocampuz', licence: 'CC BY-SA 4.0', url: wc('Pasos en escalera de caracol.ogg') },
  { title: 'Rusty metal door clasp', by: 'stephan', licence: 'Public domain', url: wc('Rusty metal door clasp.ogg') },
  { title: 'Metal cabinet door jarring', by: 'stephan', licence: 'Public domain', url: wc('Metal cabinet door jarring.ogg') },
]

export const music: Credit[] = [
  { title: 'Feeling Watched', by: 'SINIUS, The Silence Before the Haunting', licence: 'CC BY 4.0', url: 'https://freemusicarchive.org/music/sinius/the-silence-before-the-haunting/feeling-watched/' },
  { title: 'Sensory Deprivation', by: 'SINIUS, The Silence Before the Haunting', licence: 'CC BY 4.0', url: 'https://freemusicarchive.org/music/sinius/the-silence-before-the-haunting/sensory-deprivation/' },
  { title: 'Perceptual Isolation', by: 'SINIUS, The Silence Before the Haunting', licence: 'CC BY 4.0', url: 'https://freemusicarchive.org/music/sinius/the-silence-before-the-haunting/perceptual-isolation/' },
]

export const images: Credit[] = [
  { title: 'Fig. 904, external and middle ear', by: 'Henry Gray, Anatomy of the Human Body, 1918', licence: 'Public domain', url: wc('Gray904.png') },
  { title: 'Fig. 928, section through the cochlea', by: 'Henry Gray, Anatomy of the Human Body, 1918', licence: 'Public domain', url: wc('Gray928.png') },
]

export const photographs = { denge: { title: 'Acoustic Mirrors', by: 'Teseum', licence: 'CC BY-SA 4.0', url: wc('Acoustic_Mirrors.jpg') } }

export const materials: Credit[] = [
  { title: 'Concrete Layers 02', by: 'Poly Haven', licence: 'CC0', url: ph('concrete_layers_02') },
  { title: 'Concrete Wall 006', by: 'Poly Haven', licence: 'CC0', url: ph('concrete_wall_006') },
  { title: 'Damaged Concrete Floor', by: 'Poly Haven', licence: 'CC0', url: ph('damaged_concrete_floor') },
  { title: 'Dark Rock', by: 'Poly Haven', licence: 'CC0', url: ph('dark_rock') },
  { title: 'Dark Wooden Planks', by: 'Poly Haven', licence: 'CC0', url: ph('dark_wooden_planks') },
  { title: 'Rust Coarse 01', by: 'Poly Haven', licence: 'CC0', url: ph('rust_coarse_01') },
  { title: 'Damp Beach Sand', by: 'Poly Haven', licence: 'CC0', url: ph('damp_beach_sand') },
  { title: 'Painted Wooden Chair 01', by: 'Kuutti Siitonen, Poly Haven', licence: 'CC0', url: ph('painted_wooden_chair_01') },
  { title: 'Metal Office Desk', by: 'Ulan Cabanilla, Poly Haven', licence: 'CC0', url: ph('metal_office_desk') },
  { title: 'Vintage Oil Lamp', by: 'Monsta3D, Poly Haven', licence: 'CC0', url: ph('vintage_oil_lamp') },
  { title: 'Hanging Industrial Lamp', by: 'Kuutti Siitonen, Poly Haven', licence: 'CC0', url: ph('hanging_industrial_lamp') },
  { title: 'Vintage Radio Transceiver', by: 'Mateusz Sadek, Poly Haven', licence: 'CC0', url: ph('vintage_radio_transceiver') },
]

export const fonts: Credit[] = [
  { title: 'Host Grotesk', by: 'Element Type', licence: 'SIL OFL 1.1', url: 'https://fonts.google.com/specimen/Host+Grotesk' },
  { title: 'Courier Prime', by: 'Alan Dague-Greene', licence: 'SIL OFL 1.1', url: 'https://fonts.google.com/specimen/Courier+Prime' },
]

export const reading: Credit[] = [
  { title: 'I Am Sitting in a Room, 1969', by: 'Alvin Lucier', licence: 'Reference', url: 'https://en.wikipedia.org/wiki/I_Am_Sitting_in_a_Room' },
  { title: 'The Denge sound mirrors, Kent, 1928 to 1930', by: 'Historic England', licence: 'Reference', url: 'https://historicengland.org.uk/research/results/reports/96-1999' },
  { title: 'Voder, Bell Labs, 1939', by: 'Homer Dudley', licence: 'Reference', url: 'https://en.wikipedia.org/wiki/Voder' },
]
