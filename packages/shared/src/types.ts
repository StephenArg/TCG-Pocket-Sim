export type PlayerID = string;
export type GameID = string;

export type Phase = "SETUP" | "DRAW" | "MAIN" | "ATTACK" | "END" | "PROMPT";

export type Zone =
  | "DECK"
  | "HAND"
  | "DISCARD"
  | "ACTIVE"
  | "BENCH";

export type CardType = "POKEMON" | "TRAINER" | "ENERGY";

export type Status = "ASLEEP" | "PARALYZED" | "POISONED" | "BURNED";

export type CardID = string;
export type CardInstanceID = string;

export interface TargetRef {
  kind: "card";
  instanceId: CardInstanceID;
}

export interface CardInstance {
  instanceId: CardInstanceID;
  cardId: CardID;
  ownerId: PlayerID;

  zone: Zone;

  // Gameplay fields (extend over time)
  hp?: number; // only for pokemon
  maxHp?: number;
  statuses: Status[];
  damageCounters: number; // can use raw hp too; pick one model and stick to it
}

export interface PlayerState {
  playerId: PlayerID;
  deck: CardInstanceID[];    // instanceIds, order matters
  hand: CardInstanceID[];
  discard: CardInstanceID[];
  active?: CardInstanceID;   // pokemon
  bench: CardInstanceID[];
}

export interface TurnState {
  number: number;
  activePlayerId: PlayerID;
  phase: Phase;
}

export interface RNGState {
  seed: number;  // deterministic PRNG seed
}

export interface ChooseTargetPrompt {
  id: string;
  kind: "CHOOSE_TARGET";
  playerId: PlayerID;
  message: string;
  candidates: TargetRef[];

  // For skeleton simplicity, we store what to do after choice:
  continuation:
    | { type: "ATTACK_DAMAGE"; source: TargetRef; damage: number }
    | { type: "CARD_EFFECT_DAMAGE"; source: TargetRef; damage: number };
}

export type Prompt = ChooseTargetPrompt;

export interface GameState {
  gameId: GameID;
  players: Record<PlayerID, PlayerState>;
  turn: TurnState;

  // Canonical store of all card instances:
  cards: Record<CardInstanceID, CardInstance>;

  // Effect resolution:
  effectQueue: Effect[];

  // If set, engine pauses and waits for ResolvePrompt:
  prompt: Prompt | null;

  // RNG / determinism:
  rng: RNGState;

  // Simple id counter (avoid uuid inside engine)
  nextId: number;

  // Debug/replay (optional):
  history: GameEvent[];
}

/** Actions are the ONLY thing clients send. */
export type Action =
  | { type: "START_GAME" }
  | { type: "END_TURN"; playerId: PlayerID }
  | { type: "PLAY_CARD"; playerId: PlayerID; instanceId: CardInstanceID }
  | {
      type: "ATTACK";
      playerId: PlayerID;
      attackerId: CardInstanceID;
      moveId: string;
    }
  | {
      type: "RESOLVE_PROMPT";
      playerId: PlayerID;
      promptId: string;
      choice: TargetRef;
    };

/** Effects are internal; server never accepts them from clients. */
export type Effect =
  | { type: "DRAW"; playerId: PlayerID; count: number }
  | { type: "MOVE_CARD"; instanceId: CardInstanceID; to: Zone }
  | { type: "DEAL_DAMAGE"; source: TargetRef; target: TargetRef; amount: number }
  | { type: "HEAL"; target: TargetRef; amount: number }
  | { type: "SET_PHASE"; phase: Phase }
  | { type: "CREATE_PROMPT"; prompt: Prompt }
  | { type: "CLEAR_PROMPT"; promptId: string }
  | { type: "ADVANCE_TURN" };

/** Events are what clients receive (for UI + animation + log). */
export type GameEvent =
  | { type: "PHASE_CHANGED"; phase: Phase }
  | { type: "CARD_MOVED"; instanceId: CardInstanceID; from: Zone; to: Zone }
  | { type: "DAMAGE_DEALT"; source: TargetRef; target: TargetRef; amount: number }
  | { type: "HEALED"; target: TargetRef; amount: number }
  | { type: "PROMPT_CREATED"; prompt: Prompt }
  | { type: "PROMPT_CLEARED"; promptId: string }
  | { type: "TURN_ADVANCED"; activePlayerId: PlayerID; turnNumber: number }
  | { type: "ACTION_REJECTED"; reason: string };

