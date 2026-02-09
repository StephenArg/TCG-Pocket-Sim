import { useParams } from "react-router-dom";

export function Room() {
  const { roomId } = useParams();
  return (
    <div>
      <h2>Room: {roomId}</h2>
      <p>Render game state here.</p>
    </div>
  );
}

