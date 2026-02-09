import { Link } from "react-router-dom";

export function Home() {
  return (
    <div>
      <h1>Pokemon TCG Pocket Simulator</h1>
      <p>Start a match or join a room.</p>
      <Link to="/lobby">Go to Lobby</Link>
    </div>
  );
}

