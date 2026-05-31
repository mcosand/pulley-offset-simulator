import { Link } from "@tanstack/react-router";

export default function Home() {
  return (
    <div>
      <div><Link to="/offset">Offset deflection</Link></div>
      <div><Link to="/guiding-line">Guiding line</Link></div>
    </div>
  )
}