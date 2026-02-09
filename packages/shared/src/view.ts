import type { GameState, PlayerID, PlayerState } from "./types";

export interface PlayerViewState extends GameState {
  // same shape, but with redacted zones as needed
}

export function viewForPlayer(full: GameState, viewerId: PlayerID): PlayerViewState {
  // Shallow clone (you can deep clone if you mutate views)
  const state: any = structuredClone(full);

  // Redact other player's hand and deck order (show counts only if you prefer)
  for (const [pid, ps] of Object.entries(state.players) as [PlayerID, PlayerState][]) {
    if (pid !== viewerId) {
      // Replace with placeholders (or [] + count fields)
      ps.hand = ps.hand.map(() => "UNKNOWN_CARD");
      ps.deck = ps.deck.map(() => "UNKNOWN_CARD");
    }
  }

  // Also redact card instance details for unknown placeholders if needed
  // (MVP can skip this; later you’ll want better redaction)
  return state as PlayerViewState;
}

