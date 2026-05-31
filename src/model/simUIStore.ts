export interface Coord {
  x: number
  y: number
}

export interface Anchor {
  center: Coord
  color: string
}

export interface Pulley {
  id: string
  center: Coord,
  color?: string
}

export interface Label {
  id: string
  coord: Coord
  text: string
}

interface Line {
  id: string
  end1: Coord
  end2: Coord
}

export interface Rope extends Line {
  color: string
}

export interface CircleGuide {
  type: 'circle'
  id: string
  center: Coord
  radius: number
}

export interface LineGuide extends Line {
  type: 'line'
  dash?: string
}

export type Guide = CircleGuide|LineGuide

export interface SimUIStore {
  updateScreenSize(size: Coord): void
  pickup(name: string): void
  move(coord: Coord): void
  drop(): void

  readonly sizePx: Coord
  readonly sizeMeters: Coord
  readonly anchors: Record<string, Anchor>
  readonly ropes: Rope[]
  readonly pulleys: Pulley[]
  readonly guides?: Guide[]
  readonly labels?: Label[]
}
