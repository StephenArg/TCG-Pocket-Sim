import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../state/useAppStore.ts";

export function Lobby() {
  const [roomId, setRoomId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!username) {
      return;
    }
    console.log("submitting username", username);
    fetch("http://localhost:3001/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: username }),
    }).then(res => res.json()).then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        setUser(data);
      }
    });
  };

  return (
    <div>
      <h2>Lobby</h2>
      {!hasHydrated ? (
        <p>Loading…</p>
      ) : !user ? (<><label>
        Name:{" "}
        <input value={username} placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
      </label>
      <button onClick={handleSubmit}>
        Sign Up
      </button></>) : (
        <>
      <label>
        Room ID:{" "}
        <input value={roomId} placeholder="room-1" onChange={(e) => setRoomId(e.target.value)} />
      </label>
      <button onClick={() => navigate(`/room/${encodeURIComponent(roomId)}`)}>
        Join
        </button></>)}
    </div>
  );
}

