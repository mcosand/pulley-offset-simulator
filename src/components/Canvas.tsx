import { observer } from "mobx-react-lite"
import type { Coord, Store } from "../store"
import { useState } from "react";

export const Canvas = observer(({ store }: { store: Store }) => {

  const [ offset, setOffset ] = useState<Coord>({ x: 0, y: 0 });

  function onDown(e: React.MouseEvent<SVGCircleElement>) {
    const svg = e.currentTarget.closest('svg')
    const pt = svg.createSVGPoint()

    Object.assign(pt, { x: e.clientX, y: e.clientY })
    const cursor = pt.matrixTransform(svg.getScreenCTM().inverse())
    setOffset({
      x: cursor.x - Number(e.currentTarget.getAttribute('cx')),
      y: cursor.y - Number(e.currentTarget.getAttribute('cy')),
    })
    store.pickup(e.currentTarget.id as 'red'|'black')
  }

  function move(e: React.MouseEvent<SVGElement>) {
    const svg = e.currentTarget.closest('svg')
    const pt = svg.createSVGPoint()

    Object.assign(pt, { x: e.clientX, y: e.clientY })
    const cursor = pt.matrixTransform(svg.getScreenCTM().inverse())
    store.move({
      x: cursor.x - offset.x,
      y: cursor.y - offset.y
    })
  }

  function up() {
    store.drop();
  }

  return (
    <svg width="800" height="600" id="svg-canvas" style={{ border: 'solid 1px #444' }}
    onMouseMove={move} onMouseUp={up} viewBox="0 0 100 100">
      {store.showGuides && <circle id="radius" cx={store.anchors.red.x} cy={store.anchors.red.y} r={store.redLength} style={{ fill: 'transparent', stroke: '#0003', strokeWidth: .2 }} />}
      {store.showGuides && store.pulley?.deflection && <line id="bisect" x1={store.pulley.x} y1={store.pulley.y} x2={store.bisectEnd.x} y2={store.bisectEnd.y} style={{ stroke: '#0004', strokeWidth: .2, strokeDasharray: '1 2' }} />}

      <line id="black1" x1={store.anchors.black.x} y1={store.anchors.black.y} x2={store.blackMiddle.x} y2={store.blackMiddle.y} style={{ stroke: '#444', strokeWidth: .2 }} />
      <line id="black2" x1={store.blackMiddle.x} y1={store.blackMiddle.y} x2={store.blackEnd.x} y2={store.blackEnd.y} style={{ stroke: '#444', strokeWidth: .2 }} />
      <line id="redrope" x1={store.anchors.red.x} y1={store.anchors.red.y} x2={store.pulleyEx.x} y2={store.pulleyEx.y} style={{ stroke: '#f00', strokeWidth: .2 }} />

      <circle id="pulley" cx={store.pulleyEx.x} cy={store.pulleyEx.y} r="2" style={{ fill: '#0f08' }} />
      <circle id="red" onMouseDown={onDown} cx={store.anchors.red.x} cy={store.anchors.red.y} r="2" style={{ fill: '#800', pointerEvents: 'auto' }} />
      <circle id="black" onMouseDown={onDown} cx={store.anchors.black.x} cy={store.anchors.black.y} r="2" style={{ fill: '#444', pointerEvents: 'auto' }} />
      {store.searchPoints.map(p => (<text key={p.l} x={p.x} y={p.y} style={{fontSize: '3px'}}>{p.l}</text>))}
    </svg>
  )
})