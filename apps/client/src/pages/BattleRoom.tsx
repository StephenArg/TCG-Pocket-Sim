import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../state/useAppStore.ts";

export function BattleRoom() {
  const user = useAppStore((s) => s.user);
  const decks = useAppStore((s) => s.decks);
  const navigate = useNavigate();

  return (
    <div>
      <h2>Battle Room</h2>

    </div>
  );
}