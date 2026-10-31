declare module 'n8ao' {
  import type { Pass } from 'postprocessing'
  import type { Camera, Scene } from 'three'
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width: number, height: number)
    scene: Scene
    configuration: { aoRadius: number; distanceFalloff: number; intensity: number; gammaCorrection: boolean }
    setQualityMode(mode: 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra'): void
  }
}
