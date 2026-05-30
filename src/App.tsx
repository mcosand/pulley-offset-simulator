import { useMemo } from 'react'
import './App.css'
import { Store } from './store'
import { observer } from 'mobx-react-lite'
import { Canvas } from './components/Canvas'

const Content = observer(({ store }: { store: Store }) => {
  return (
    <div style={{display:'flex', flexDirection: 'column', maxWidth: 800}}>
      <Canvas store={store}/>
      <div style={{display:'flex'}}>
        Redirect Length:
        <input style={{flex:'1 1 auto'}} type="range" value={store.redLength} min={0} max={100} onChange={e => store.setRedLength(Number(e.currentTarget.value))}/>
        <input style={{width: '4em'}} type="number" value={store.redLength.toFixed(1)} min="0" max={store.anchorDistance} onChange={e => store.setRedLength(Number(e.currentTarget.value))} />m
      </div>
      <div>Angle: {store.pulley?.angle?.toFixed(1)}&deg;</div>
      <div>Deflection: {store.pulley?.deflection?.toFixed(1)}&deg;</div>
    </div>
  )
})

function App() {
  const store = useMemo(() => new Store(), [])
  return (<Content store={store} />)
}

export default App
