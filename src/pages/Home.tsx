import { Link } from "@tanstack/react-router";

export default function Home() {
  return (
    <div>
      <div><Link to="/offset">Offset deflection</Link></div>
      {/* <div><Link to="/highline">Highline</Link></div> */}
    </div>
  )
}