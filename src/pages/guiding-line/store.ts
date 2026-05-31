import { action, computed, makeObservable, observable } from 'mobx'
import type { Coord, Guide, Pulley, Rope, SimUIStore } from '../../model/simUIStore'

const MIN_DEFLECTION_LENGTH = .001
// const toDeg = (rad: number) => (rad * 180 / Math.PI)
// const toDegU = (rad: number | undefined) => rad !== undefined ? (rad * 180 / Math.PI) : undefined
// const toRad = (deg: number) => (deg / 180 * Math.PI)

interface _GeometrySolution {
  guidingLength: number
  ttrsTension?: number
  pulley: Coord
}

interface _TensionSolution {
  guidingTension: number;
  deflection: { angle?: number, force: number };
  ttrsTension: number;
  /** angle from deflection resultant to horizontal. Use for drawing guides */
  resultantAngle?: number,
  ttrsAngle?: number,
}

export type Solution = _GeometrySolution & Omit<_TensionSolution, 'resultantAngle|ttrsAngle'>

function flipAngle(deg: number | undefined, swapped: boolean) {
  if (deg === undefined) return undefined
  return swapped ? (540 - deg) % 360 : deg
}

function flipCoords(coord: Coord, swapped: boolean) {
  return swapped ? { ...coord, x: -coord.x } : coord
}

function offset(coord: Coord, distance: number, rad: number) {
  return {
    x: coord.x + distance * Math.cos(rad),
    y: coord.y - distance * Math.sin(rad),
  }
}

export class Store implements SimUIStore {
  @observable accessor sizePx = { x: 800, y: 600 }
  @observable accessor sizeMeters = { x: 100, y: 75 }

  @observable accessor searchPointsVisible = false
  @observable accessor bisectLength = 20
  @observable accessor showGuides: boolean = true

  @observable accessor anchors = {
    high: { color: '#222', center: { x: 80, y: 6 } },
    low: { color: '#444', center: { x: 12, y: 35 } },
  }

  /** normalize anchors to lower on left, at x=0 */
  @computed
  get normalAnchors(): { low: Coord, high: Coord, swapped: boolean } {
    const low = this.anchors.low.center
    const high = this.anchors.high.center
    const swapped = low.x > high.x
    return {
      swapped,
      low: flipCoords(low, swapped),
      high: flipCoords(high, swapped),
    }
  }

  @observable accessor ttrsLength = 25
  @observable accessor blackLength = 80
  @observable accessor load = 2000

  @observable accessor selected: string | undefined = undefined

  @observable accessor searchPoints: Array<Coord & { l: string }> = []

  constructor() {
    makeObservable(this)
    // reaction(
    //   () => [this.blackLength, this.anchors.low, this.anchors.high],
    //   () => this.solution = this.solve(),
    //   { fireImmediately: true }
    // )
  }

  @computed
  get guides(): Guide[] {
    if (!this.showGuides) return [];
    const list: Guide[] = [
      { type: 'circle', id: 'top', center: this.anchors.high.center, radius: this.ttrsLength },
      { type: 'circle', id: 'bottom', center: this.anchors.low.center, radius: this.blackLength - this.ttrsLength },
    ]
    if (this.solutionAndExtra.resultantAngle !== undefined) {
      list.push({ type: 'line', id:'deflect', end1: this.solutionAndExtra.pulley, end2: offset(this.solutionAndExtra.pulley, 15 * (this.solutionAndExtra.deflection.force / this.load), this.solutionAndExtra.resultantAngle ), color: '#00f'})
    }
    if (this.solutionAndExtra.ttrsAngle !== undefined) {
      list.push({ type: 'line', id:'ttrs', end1: this.solutionAndExtra.pulley, end2: offset(this.solutionAndExtra.pulley, 15 * (this.solutionAndExtra.ttrsTension / this.load), this.solutionAndExtra.ttrsAngle ), color: '#ff0'})

      list.push({ type: 'line', id:'guide', end1: this.solutionAndExtra.pulley, end2: offset(this.solutionAndExtra.pulley, 15 * (this.solutionAndExtra.guidingTension / this.load), this.solutionAndExtra.ttrsAngle+Math.PI-this.solutionAndExtra.deflection.angle! ), color: '#f0f'})
    }
    list.push({ type: 'line', id:'load', end1: this.solutionAndExtra.pulley, end2: offset(this.solutionAndExtra.pulley, 15, -Math.PI/2 ), color: '#f00'})
    
    return list
  }

  @computed
  get ropes(): Rope[] {
    if (this.solution) {
      return [
        { id: 'black1', end1: this.anchors.high.center, end2: this.solution.pulley, color: '#222' },
        ...this.slackableRope('rope', this.solution?.pulley ?? this.anchors.high.center, this.anchors.low.center, (this.solution?.guidingLength ?? this.blackLength) - this.ttrsLength, '#222')
      ]
    }
    return []
  }

  private slackableRope(id: string, end1: Coord, end2: Coord, length: number, color: string) {
    //                              / E1
    //                            /
    //                          /   |
    //                        /     h
    //                      /       |
    //        b1          /     b2
    // ===================-----------
    // E2            w
    //
    const w = end1.x - end2.x
    const h = end1.y - end2.y
    const flip = h > 0
    // b1 = w - b2
    // length = b1 + sqrt(b2^2 + h^2)
    // length = w - b2 + sqrt(b2^2 + h^2)
    // (wolfram alpha)
    const b2 = Math.max(0, (h ** 2 - length ** 2 + 2 * w * length - w ** 2) / (2 * (length - w)))
    const b1 = Math.max(0, w - b2)
    const bend = flip ? { x: end2.x + b2, y: end1.y } : { x: end1.x - b2, y: end2.y }
    const result: Rope[] = [
      { id, end1: flip ? end2 : end1, end2: bend, color }
    ]
    if (b1 > 0 && !flip) {
      result.push({ id: `${id}-slack`, end1: bend, end2, color })
    } else if (b1 > 0 && flip) {
      result.push({ id: `${id}-slack`, end1, end2: bend, color })
    }

    return result
  }

  @computed
  get pulleys(): Pulley[] {
    return [{ id: 'pulley', center: this.solution?.pulley ?? { x: 8, y: 40 } }]
  }

  private distance(end1: Coord, end2: Coord) {
    return Math.sqrt((end1.x - end2.x) ** 2 + (end1.y - end2.y) ** 2)
  }
  @computed
  get guideAnchorDistance() {
    return this.distance(this.anchors.high.center, this.anchors.low.center)
  }

  @computed
  private get normalGeometry(): _GeometrySolution {
    const { low, high } = this.normalAnchors
    const anchorDistance = this.distance(low, high)
    if (this.ttrsLength > anchorDistance) {
      console.log('at the bottom')
      return {
        ttrsTension: 0,
        guidingLength: high.y - low.y,
        pulley: { x: high.x, y: low.y },
      }
    }
    const guidingLength = Math.max(this.blackLength, anchorDistance * (1 + MIN_DEFLECTION_LENGTH))

    const { x: x1, y: y1 } = high
    const { x: x0, y: y0 } = low

    const r1 = this.ttrsLength
    const r0 = guidingLength - this.ttrsLength

    const a = (r1 ** 2 - r0 ** 2 + anchorDistance ** 2) / (2 * anchorDistance)
    const h = Math.sqrt(Math.max(r1 ** 2 - a ** 2, 0))
    if (isNaN(h)) {
      console.log('nan h', r1 ** 2, a ** 2)
      throw new Error('unsupported geometry')
    }
    const mx = x1 + a * (x0 - x1) / anchorDistance
    const my = y1 + a * (y0 - y1) / anchorDistance

    const int1 = {
      x: mx + h * (y0 - y1) / anchorDistance,
      y: my - h * (x0 - x1) / anchorDistance,
    }
    const int2 = {
      x: mx - h * (y0 - y1) / anchorDistance,
      y: my + h * (x0 - x1) / anchorDistance,
    }

    const pulley = int1.y > int2.y ? int1 : int2

    if (Math.sign(pulley.x - x0) === Math.sign(pulley.x - x1)) {
      console.log('slack with pulley straight down')
      return {
        ttrsTension: this.load,
        guidingLength,
        pulley: { x: x1, y: y1 + this.ttrsLength }
      }
    }

    return {
      guidingLength,
      pulley,
    }
  }

  @computed
  private get tensions(): _TensionSolution {
    const { pulley, ttrsTension } = this.normalGeometry

    //      \ D(eflection) / R(estraint)
    //       \          /
    //        \      /
    //  angleD \  / angleR
    //      __--*
    //  __--    |
    //--       load

    const { low, high } = this.normalAnchors

    if (ttrsTension !== undefined) {
      return {
        ttrsTension,
        guidingTension: 0,
        deflection: { force: 0 }
      }
    }

    const angleR = Math.atan2(pulley.y - high.y, high.x - pulley.x)
    const lowerDescendingFromHorizontal = Math.atan2(low.y - pulley.y, pulley.x - low.x)
    // angle between left horizon and deflection resultant
    const innerDeflectionAngle = Math.PI /* semi-circle above horizontal */ + lowerDescendingFromHorizontal - angleR
    // inner angle between resultant vector and left horizontal
    const angleD = Math.PI - angleR - innerDeflectionAngle/2

    const deflectionForce = this.load * Math.cos(angleR) / Math.sin(angleR + angleD)
    const _ttrsTension = deflectionForce * Math.cos(angleD)/Math.cos(angleR)

    return {
      deflection: { angle: Math.PI - innerDeflectionAngle, force: deflectionForce },
      guidingTension: deflectionForce / Math.cos(innerDeflectionAngle/2) / 2,
      ttrsTension: _ttrsTension,
      resultantAngle: angleR + innerDeflectionAngle/2,
      ttrsAngle: angleR,
    }
  }


  @computed
  get solutionAndExtra(): _GeometrySolution & _TensionSolution {
    const { pulley } = this.normalGeometry
    const { deflection, resultantAngle } = this.tensions
    const { swapped } = this.normalAnchors

    return {
      ...this.normalGeometry,
      ...this.tensions,
      pulley: flipCoords(pulley, swapped),
      deflection: { ...deflection, angle: flipAngle(deflection.angle, swapped) },
      resultantAngle: flipAngle(resultantAngle, swapped)
    }
  }

  @computed
  get solution(): Solution {
    const { resultantAngle, ttrsAngle, ...solution } = this.solutionAndExtra
    return solution
  }

  @action.bound
  updateScreenSize(size: Coord): void {
    this.sizePx = size
    this.sizeMeters = size.x < size.y
      ? { x: 100, y: 100 * size.y / size.x }
      : { x: 100 * size.x / size.y, y: 100 }
  }

  @action.bound
  pickup(name: string) {
    this.selected = name
  }

  @action.bound
  move(coord: Coord) {
    if (!this.selected) return;
    if (this.selected === 'high') coord.y = Math.min(coord.y, this.anchors.low.center.y)
    if (this.selected === 'low') coord.y = Math.max(coord.y, this.anchors.high.center.y)
    this.anchors = {
      ...this.anchors,
      [this.selected]: { ...this.anchors[this.selected], center: coord },
    }
  }

  @action.bound
  drop() {
    this.selected = undefined
  }
}