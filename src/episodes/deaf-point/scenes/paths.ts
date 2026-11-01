import { Vector3 } from 'three'

// Dimensions and camera routes of the headland, kept apart so the main bundle needs no scene code.
export const DISH_R = 15
export const DISH_F = 9
export const GROUND = 30
export const CX = DISH_R + GROUND // height of the dish axis
export const FOCUS = new Vector3(0, CX, -DISH_F + 1)

const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z)
export const flightPath = () => [v3(0, 5, -560), v3(3, 6.5, -360), v3(-6, 12, -180), v3(-10, 30, -96), v3(-11, GROUND + 6, -62), v3(-8.5, GROUND + 1.65, -33)]
export const descentPath = () => [v3(0, CX + 1.2, FOCUS.z + 0.05), v3(0, CX + 1.1, -2.5), v3(0, CX + 0.5, -0.4), v3(0, CX + 0.2, 1.1)]
