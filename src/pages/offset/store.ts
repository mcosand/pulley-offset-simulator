import { action, computed, makeObservable, observable, reaction } from 'mobx'
import type { Anchor, Coord, Guide, Pulley, Rope, SimUIStore } from '../../model/simUIStore'

const EPSILON = 0.01

export interface PulleyCoords extends Coord {
  /** How many degrees deflection is the pulley imposing on the black rope? 0 = none, 180 = folded back on itself */
  deflection?: number
  /** Angle of the pulley from the red anchor */
  angle?: number 
}

interface Anchors {
  red: Anchor
  black: Anchor
}
type AnchorName = keyof Anchors

export class Store implements SimUIStore {
  @observable accessor sizePx = { x: 800, y: 600 }
  @observable accessor sizeMeters = { x: 100, y: 75 }

  @observable accessor searchPointsVisible = false
  @observable accessor bisectLength = 20
  @observable accessor showGuides: boolean = true

  @observable accessor anchors = {
        red: { color: '#800', center: { x: 5, y: 5 } },
        black: { color: '#222', center: { x: 80, y: 6 }},
      }

  @observable accessor pulley: PulleyCoords|undefined = undefined
  @observable accessor redLength: number = 20
  @observable accessor blackTension: number = 2000
  @observable accessor selected: AnchorName|undefined = undefined

  @observable accessor searchPoints: Array<Coord & { l: string }> = []

  constructor() {
    makeObservable(this)
    reaction(
      () => [ this.redLength, this.anchors.red, this.anchors.black ],
      () => this.pulley = this.solvePulleyLocation(),
      { fireImmediately: true }
    )
  }

  @computed
  get guides(): Guide[] {
    if (!this.showGuides) return [];
    const list: Guide[] = [
      { type: 'circle', id: 'radius', center: this.anchors.red.center, radius: this.redLength }
    ]
    if (this.pulley?.deflection && this.bisectEnd) {
      list.push({ type: 'line', id: 'bisect', end1: this.pulley, end2: this.bisectEnd, dash: '1 2' })
    }
    return list
  }

  @computed
  get ropes(): Rope[] {
    return [
      { id: 'black1', end1: this.anchors.black.center, end2: this.blackMiddle, color: '#222' },
      { id: 'black2', end1: this.blackMiddle, end2: this.blackEnd, color: '#222' },
      { id: 'red', end1: this.anchors.red.center, end2: this.pulleyEx, color: '#f00' },
    ]
  }

  @computed
  get pulleys(): Pulley[] {
      return [ { id: 'pulley', center: this.pulleyEx }]
  }

  @computed
  get redTension() {
    if (this.pulley?.deflection) {
      return this.blackTension * 2 * Math.sin((this.pulley.deflection / 2)/180*Math.PI);
    }
    return 0;
  }

  @computed
  get anchorDistance() {
    return Math.sqrt((this.anchors.red.center.x - this.anchors.black.center.x)**2 + (this.anchors.red.center.y - this.anchors.black.center.y)**2)
  }

  @computed
  private get pulleyEx() {
    return this.pulley ?? { x: this.anchors.red.center.x, y: this.anchors.red.center.y + this.redLength }
  }

  @computed
  private get blackMiddle() {
    return this.pulley ?? this.anchors.black.center;
  }

  @computed
  private get blackEnd() {
    return this.pulley ? { x: this.pulley.x, y: 500 } : { x: this.anchors.black.center.x, y: 500 }
  }

  @computed
  get bisectEnd() {
    if (this.pulley?.angle === undefined || !this.redLength) return undefined
    return {
      x: this.pulley.x + this.bisectLength * Math.cos(this.pulley.angle/180*Math.PI),
      y: this.pulley.y - this.bisectLength * Math.sin(this.pulley.angle/180*Math.PI),
    }
  }

  @action.bound
  updateScreenSize(size: Coord): void {
    this.sizePx = size
    this.sizeMeters = size.x < size.y
      ? { x: 100, y: 100 * size.y / size.x }
      : { x: 100 * size.x / size.y, y: 100 }
  }

  @action.bound
  setRedLength(length: number) {
    this.redLength = length
  }

  @action.bound
  pickup(name: AnchorName) {
    this.selected = name
  }

  @action.bound
  move(coord: Coord) {
    if (!this.selected) return;
    this.anchors = {
      ...this.anchors,
      [this.selected]: { ...this.anchors[this.selected], center: coord },
    }
  }

  @action.bound
  drop() {
    this.selected = undefined
  }

  @action.bound
  private solvePulleyLocation(): PulleyCoords|undefined {
    const { red, black } = this.anchors

    if ((this.redLength > this.anchorDistance) ||
        (black.center.y < red.center.y && Math.abs(black.center.x - red.center.x) < this.redLength)) {
      const angle = Math.acos((black.center.x - red.center.x)/this.redLength)*180/Math.PI
      return {
        x: black.center.x,
        y: red.center.y + this.redLength * Math.sin(angle/180*Math.PI),
        angle,
        deflection: 0,
      }
    }
    //console.log('red to black', (360 + Math.atan2((red.center.y-black.center.y),(black.center.x-red.center.x)) * 180 / Math.PI) % 360)
    const redToBlackDeg = (360 + Math.atan2((red.center.y-black.center.y),(black.center.x-red.center.x)) * 180 / Math.PI) % 360

    let L = redToBlackDeg
    let R = 270
    if (red.center.x < black.center.x) {
      L = 270
      R = ((red.center.y < black.center.y) ? 0 : 360) + redToBlackDeg
    }

    let i = 0
    if (this.searchPointsVisible) {
      this.searchPoints = [ { ...this.findPulleyLocation(L), l: 'L0'}, { ...this.findPulleyLocation(R), l: 'R0'}]
    }
    //console.log('start solve', JSON.parse(JSON.stringify({ red, black, L, R })))
    while (R - L > EPSILON) {
      i++
      const m1 = L + (R-L)/3
      const m2 = R - (R-L)/3

      const r1 = this.findPulleyLocation(m1)
      const r2 = this.findPulleyLocation(m2)
      if (this.searchPointsVisible) {
        if (!isNaN(r1.delta)) this.searchPoints.push({...r1, l: `L${i}` })
        if (!isNaN(r2.delta)) this.searchPoints.push({...r2, l: `R${i}` })
      }
      if (r1.delta < r2.delta) {
        R = m2
      } else {
        L = m1
      }
    }

    const best = this.findPulleyLocation((L + R)/2)
    this.searchPoints = []
    return best;
  }

  private findPulleyLocation(degFromRed: number): PulleyCoords & { delta: number } {
    const { red, black } = this.anchors
    const p = {
      x: red.center.x + this.redLength * Math.cos(degFromRed/180*Math.PI),
      y: red.center.y - this.redLength * Math.sin(degFromRed/180*Math.PI),
    }

    const angleFromPulleyToBlack = (360 + (Math.atan2(p.y - black.center.y, black.center.x - p.x) * 180 / Math.PI)) % 360
    const angleFromPulleyToRed = (360 + Math.atan2(p.y - red.center.y, red.center.x - p.x) * 180 / Math.PI) % 360

    const downToBlack = (90 + angleFromPulleyToBlack) % 360
    const downToRedMinor = (360 + ((red.center.x < black.center.x) ? 270 - angleFromPulleyToRed : 90 + angleFromPulleyToRed)) % 360;
    const blackOutsideAngle = (red.center.x < black.center.x) ? (360 - downToBlack) : downToBlack;

    const delta = Math.abs(downToRedMinor-blackOutsideAngle/2);
    //if (log) console.log({dr: degFromRed, ptb: angleFromPulleyToBlack, ptr: angleFromPulleyToRed, dt: delta, downToBlack, downToRedMinor, blackOutsideAngle })
    return { ...p, delta, angle: (180+angleFromPulleyToRed) % 360, deflection: (180 + blackOutsideAngle) % 360 }
  }
}