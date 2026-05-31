import { observer } from "mobx-react-lite"
import { useState } from "react"
import type { Coord, SimUIStore } from "../model/simUIStore"

export const Canvas = observer(({ store }: { store: SimUIStore }) => {

  const [ offset, setOffset ] = useState<Coord>({ x: 0, y: 0 })

  function getCursor(e: React.MouseEvent<SVGElement>) {
    const svg = e.currentTarget.closest('svg')!
    const pt = svg.createSVGPoint()

    Object.assign(pt, { x: e.clientX, y: e.clientY })
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  function onDown(e: React.MouseEvent<SVGCircleElement>) {
    const cursor = getCursor(e)
    setOffset({
      x: cursor.x - Number(e.currentTarget.getAttribute('cx')),
      y: cursor.y - Number(e.currentTarget.getAttribute('cy')),
    })
    store.pickup(e.currentTarget.id)
  }

  function move(e: React.MouseEvent<SVGElement>) {
    const cursor = getCursor(e)
    store.move({
      x: cursor.x - offset.x,
      y: cursor.y - offset.y
    })
  }

  function up() {
    store.drop();
  }

  console.log(JSON.parse(JSON.stringify(store.ropes)))
  return (
    <svg width={store.sizePx.x} height={store.sizePx.y} style={{ border: 'solid 1px #444', backgroundColor:'#fff' }}
    onPointerMove={move} onPointerUp={up} viewBox={`0 0 ${store.sizeMeters.x} ${store.sizeMeters.y}`}>
      {store.guides?.filter(f => f.type === 'circle').map(g => (
          <circle key={g.id} cx={g.center.x} cy={g.center.y} r={g.radius} style={{ fill: 'transparent', stroke: '#0003', strokeWidth: .2 }} />
        ))}
      {store.guides?.filter(f => f.type === 'line').map(g => (
          <line key={g.id} x1={g.end1.x} y1={g.end1.y} x2={g.end2.x} y2={g.end2.y} style={{ stroke: '#0004', strokeWidth: .2, strokeDasharray: g.dash }} />
        ))}
      {store.ropes.map(r => (
        <line key={r.id} x1={r.end1.x} y1={r.end1.y} x2={r.end2.x} y2={r.end2.y} style={{ stroke: r.color, strokeWidth: .4 }} />  
      ))}

      {store.pulleys.map(p => (
        <circle key={p.id} cx={p.center.x} cy={p.center.y} r="2" style={{ fill: p.color ?? '#0f08' }} />  
      ))}
      
      {Object.entries(store.anchors).map(([id, a]) => (
        <circle key={id} id={id} className="drag" onPointerDown={onDown} cx={a.center.x} cy={a.center.y} r="3" style={{ fill: a.color }} />
      ))}
      {store.labels?.map(l => (<text key={l.id} x={l.coord.x} y={l.coord.y} style={{fontSize: '3px'}}>{l.text}</text>))}
    </svg>
  )
})