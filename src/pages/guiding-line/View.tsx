import { useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { Canvas } from '../../components/Canvas'
import { Store } from './store'

const toDegU = (rad: number | undefined) => rad !== undefined ? (rad * 180 / Math.PI) : undefined

const Content = observer(({ store }: { store: Store }) => {
  const { deflection, ...s } = store.solution
  
  return (
    <div style={{display:'flex', flexDirection: 'column', maxWidth: 800}}>
      <Canvas store={store}/>
      <pre style={{fontSize: 13, lineHeight:'1em',textAlign:'left'}}>
        {JSON.stringify({
          ...s,
          deflectionAngle: toDegU(deflection.angle),
        }, null, 2)}
      </pre>
      {/* <div style={{display:'flex'}}>
        Redirect Length:
        <input style={{flex:'1 1 auto'}} type="range" value={store.redLength} min={0} max={100} onChange={e => store.setRedLength(Number(e.currentTarget.value))}/>
        <input style={{width: '4em'}} type="number" value={store.redLength.toFixed(1)} min="0" max={store.anchorDistance} onChange={e => store.setRedLength(Number(e.currentTarget.value))} />m
      </div>
      <div>Angle: {store.pulley?.angle?.toFixed(1)}&deg;</div>
      <div>Deflection: {store.pulley?.deflection?.toFixed(1)}&deg;</div>
      <div>Offset tension: {(store.redTension/1000).toFixed(2)}kN ({Math.round((store.redTension/store.blackTension)*100)}%)</div> */}
    </div>
  )
})

export default function View() {
  const store = useMemo(() => new Store(), [])
  return (<Content store={store} />)
}