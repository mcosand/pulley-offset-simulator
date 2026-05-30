import { action, computed, makeObservable, observable, reaction } from 'mobx'

const EPSILON = 0.01

export interface Coord {
  x: number
  y: number
}

export interface PulleyCoords extends Coord {
  /** How many degrees deflection is the pulley imposing on the black rope? 0 = none, 180 = folded back on itself */
  deflection?: number
  /** Angle of the pulley from the red anchor */
  angle?: number 
}

interface Anchors {
  red: Coord
  black: Coord
}
type AnchorName = keyof Anchors

export class Store {
  @observable accessor searchPointsVisible = false
  @observable accessor bisectLength = 20
  @observable accessor showGuides: boolean = true

  @observable accessor anchors: Anchors = {
        red: { x: 5, y: 5 },
        black: { x: 100, y: 6 },
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
  get redTension() {
    if (this.pulley?.deflection) {
      return this.blackTension * Math.sin((this.pulley.deflection / 2)/180*Math.PI);
    }
    return 0;
  }

  @computed
  get anchorDistance() {
    return Math.sqrt((this.anchors.red.x - this.anchors.black.x)**2 + (this.anchors.red.y - this.anchors.black.y)**2)
  }

  @computed
  get pulleyEx() {
    return this.pulley ?? { x: this.anchors.red.x, y: this.anchors.red.y + this.redLength }
  }

  @computed
  get blackMiddle() {
    return this.pulley ?? this.anchors.black;
  }

  @computed
  get blackEnd() {
    return this.pulley ? { x: this.pulley.x, y: 500 } : { x: this.anchors.black.x, y: 500 }
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
      [this.selected]: coord,
    }
  }

  @action.bound
  drop() {
    this.selected = undefined
  }

  @action.bound
  solvePulleyLocation(): PulleyCoords|undefined {
    const { red, black } = this.anchors

    if ((this.redLength > this.anchorDistance) ||
        (black.y < red.y && Math.abs(black.x - red.x) < this.redLength)) {
      const angle = Math.acos((black.x - red.x)/this.redLength)*180/Math.PI
      return {
        x: black.x,
        y: red.y + this.redLength * Math.sin(angle/180*Math.PI),
        angle,
        deflection: 0,
      }
    }
    //console.log('red to black', (360 + Math.atan2((red.y-black.y),(black.x-red.x)) * 180 / Math.PI) % 360)
    const redToBlackDeg = (360 + Math.atan2((red.y-black.y),(black.x-red.x)) * 180 / Math.PI) % 360

    let L = redToBlackDeg
    let R = 270
    if (red.x < black.x) {
      L = 270
      R = ((red.y < black.y) ? 0 : 360) + redToBlackDeg
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

  @action.bound
  findPulleyLocation(degFromRed: number): PulleyCoords & { delta: number } {
    const { red, black } = this.anchors
    const p = {
      x: red.x + this.redLength * Math.cos(degFromRed/180*Math.PI),
      y: red.y - this.redLength * Math.sin(degFromRed/180*Math.PI),
    }

    const angleFromPulleyToBlack = (360 + (Math.atan2(p.y - black.y, black.x - p.x) * 180 / Math.PI)) % 360
    const angleFromPulleyToRed = (360 + Math.atan2(p.y - red.y, red.x - p.x) * 180 / Math.PI) % 360

    const downToBlack = (90 + angleFromPulleyToBlack) % 360
    const downToRedMinor = (360 + ((red.x < black.x) ? 270 - angleFromPulleyToRed : 90 + angleFromPulleyToRed)) % 360;
    const blackOutsideAngle = (red.x < black.x) ? (360 - downToBlack) : downToBlack;

    const delta = Math.abs(downToRedMinor-blackOutsideAngle/2);
    //if (log) console.log({dr: degFromRed, ptb: angleFromPulleyToBlack, ptr: angleFromPulleyToRed, dt: delta, downToBlack, downToRedMinor, blackOutsideAngle })
    return { ...p, delta, angle: (180+angleFromPulleyToRed) % 360, deflection: (180 + blackOutsideAngle) % 360 }
  }
}