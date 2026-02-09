import { Link, Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Link to="/">Home</Link>
        <Link to="/lobby">Lobby</Link>
        <Link to="/deckbuilder">Deck Builder</Link>
      </header>
      <Outlet />
    </div>
  );
}

