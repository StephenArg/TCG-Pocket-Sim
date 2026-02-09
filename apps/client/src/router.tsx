import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./ui/RootLayout";
import { Home } from "./pages/Home";
import { Lobby } from "./pages/Lobby";
import { Room } from "./pages/Room";
import { NotFound } from "./pages/NotFound";
import { DeckBuilder } from "./pages/DeckBuilder";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: "lobby", element: <Lobby /> },
      { path: "deckbuilder", element: <DeckBuilder /> },
      { path: "room/:roomId", element: <Room /> },
    ],
  },
]);

