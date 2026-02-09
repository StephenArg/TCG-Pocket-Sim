import type { CardID, CardType, Effect, GameState, TargetRef } from "./types";

export interface MoveDef {
  id: string;
  name: string;
  // Build effects for this move
  buildEffects: (ctx: {
    state: GameState;
    attacker: TargetRef;
  }) => Effect[];
}

export interface CardDef {
  id: CardID;
  name: string;
  type: CardType;

  // Pokemon
  hp?: number;
  moves?: MoveDef[];

  // Trainer (simple on-play)
  onPlay?: (ctx: { state: GameState; source: TargetRef }) => Effect[];
}

export const CARDS: Record<CardID, CardDef> = {
  "pikachu-basic": {
    id: "pikachu-basic",
    name: "Pikachu",
    type: "POKEMON",
    hp: 60,
    moves: [
      {
        id: "thunder-jolt",
        name: "Thunder Jolt",
        buildEffects: ({ state, attacker }) => {
          // Example: prompt to pick opponent active as target (or bench later).
          // For now the engine will create prompt in action->effects pipeline.
          // We'll return no direct damage here; engine will handle target selection.
          // (You can also return CREATE_PROMPT from here if you prefer.)
          void state;
          void attacker;
          return [];
        },
      },
    ],
  },

  "potion": {
    id: "potion",
    name: "Potion",
    type: "TRAINER",
    onPlay: ({ source }) => {
      // For MVP: heal your active for 20 (no prompt)
      // Engine can translate "source owner's active" into an effect
      // by inspecting state in action handler.
      void source;
      return [];
    },
  },
};

