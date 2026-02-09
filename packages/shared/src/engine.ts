import { CARDS } from "./cards";
import type {
  Action,
  CardInstanceID,
  Effect,
  GameEvent,
  GameState,
  Phase,
  PlayerID,
  PlayerState,
  Prompt,
  TargetRef,
  Zone,
} from "./types";

/** Engine result: always returns a state + events. */
export interface EngineResult {
  state: GameState;
  events: GameEvent[];
}

export function createId(state: GameState, prefix: string): string {
  const id = `${prefix}_${state.nextId}`;
  state.nextId += 1;
  return id;
}

export function isPlayersTurn(state: GameState, playerId: PlayerID): boolean {
  return state.turn.activePlayerId === playerId;
}

export function getCard(state: GameState, id: CardInstanceID) {
  const c = state.cards[id];
  if (!c) throw new Error(`Missing card instance: ${id}`);
  return c;
}

export function getPlayer(state: GameState, playerId: PlayerID): PlayerState {
  const ps = state.players[playerId];
  if (!ps) throw new Error(`Missing PlayerState for ${playerId}`);
  return ps;
}

export function findZoneOfInstance(state: GameState, instanceId: CardInstanceID): Zone {
  const inst = getCard(state, instanceId);
  return inst.zone;
}

export function enqueue(state: GameState, effects: Effect[]) {
  state.effectQueue.push(...effects);
}

/** Deterministic PRNG (simple LCG) */
export function rand01(state: GameState): number {
  // LCG: X_{n+1} = (aX + c) mod m
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  state.rng.seed = (a * state.rng.seed + c) % m;
  return state.rng.seed / m;
}

export function applyAction(state: GameState, action: Action): EngineResult {
  const events: GameEvent[] = [];

  // If prompt exists, only allow RESOLVE_PROMPT from the correct player
  if (state.prompt) {
    if (action.type !== "RESOLVE_PROMPT") {
      return reject(state, events, "A prompt is awaiting resolution.");
    }
    if (action.playerId !== state.prompt.playerId) {
      return reject(state, events, "Only the prompted player may respond.");
    }
  }

  // Validate and translate action -> initial effects
  const initialEffects = actionToEffects(state, action, events);
  if (!initialEffects) return { state, events }; // rejected already

  enqueue(state, initialEffects);

  // Resolve effect queue until empty OR a prompt pauses resolution
  resolveEffects(state, events);

  // Optional: append to history for replay
  state.history.push(...events);

  return { state, events };
}

function reject(state: GameState, events: GameEvent[], reason: string): EngineResult {
  events.push({ type: "ACTION_REJECTED", reason });
  return { state, events };
}

function actionToEffects(state: GameState, action: Action, events: GameEvent[]): Effect[] | null {
  switch (action.type) {
    case "START_GAME": {
      // You likely do shuffle+draw here.
      // For MVP: just set first turn phases.
      return [{ type: "SET_PHASE", phase: "DRAW" }];
    }

    case "END_TURN": {
      if (!isPlayersTurn(state, action.playerId)) {
        reject(state, events, "Not your turn.");
        return null;
      }
      // For MVP: advance turn and go to DRAW
      return [{ type: "ADVANCE_TURN" }, { type: "SET_PHASE", phase: "DRAW" }];
    }

    case "PLAY_CARD": {
      if (!isPlayersTurn(state, action.playerId)) {
        reject(state, events, "Not your turn.");
        return null;
      }
      if (state.turn.phase !== "MAIN") {
        reject(state, events, "You can only play cards during MAIN phase.");
        return null;
      }

      const inst = getCard(state, action.instanceId);
      if (inst.ownerId !== action.playerId) {
        reject(state, events, "You do not own that card.");
        return null;
      }
      if (inst.zone !== "HAND") {
        reject(state, events, "That card is not in your hand.");
        return null;
      }

      const def = CARDS[inst.cardId];
      if (!def) {
        reject(state, events, "Unknown card definition.");
        return null;
      }

      // MVP rules:
      // - If Pokemon and no active, put into ACTIVE else BENCH
      // - If Trainer: apply its effect and discard it
      const ps = getPlayer(state, action.playerId);

      if (def.type === "POKEMON") {
        const to: Zone = ps.active ? "BENCH" : "ACTIVE";
        return [{ type: "MOVE_CARD", instanceId: inst.instanceId, to }];
      }

      if (def.type === "TRAINER") {
        // Example: potion heals your active by 20
        if (def.id === "potion") {
          if (!ps.active) {
            reject(state, events, "No active Pokémon to heal.");
            return null;
          }
          const target: TargetRef = { kind: "card", instanceId: ps.active };
          return [
            { type: "HEAL", target, amount: 20 },
            { type: "MOVE_CARD", instanceId: inst.instanceId, to: "DISCARD" },
          ];
        }

        // default discard
        return [{ type: "MOVE_CARD", instanceId: inst.instanceId, to: "DISCARD" }];
      }

      reject(state, events, "Cannot play this card type yet.");
      return null;
    }

    case "ATTACK": {
      if (!isPlayersTurn(state, action.playerId)) {
        reject(state, events, "Not your turn.");
        return null;
      }
      if (state.turn.phase !== "ATTACK") {
        reject(state, events, "You can only attack during ATTACK phase.");
        return null;
      }

      const attacker = getCard(state, action.attackerId);
      if (attacker.ownerId !== action.playerId) {
        reject(state, events, "You do not own that attacker.");
        return null;
      }
      if (attacker.zone !== "ACTIVE") {
        reject(state, events, "Only your ACTIVE Pokémon can attack.");
        return null;
      }

      // MVP: only pikachu thunder-jolt does 20 to opponent active
      const def = CARDS[attacker.cardId];
      if (!def?.moves?.some((m) => m.id === action.moveId)) {
        reject(state, events, "Unknown move.");
        return null;
      }

      const attackerRef: TargetRef = { kind: "card", instanceId: attacker.instanceId };

      // Create a prompt to pick a target (for MVP: opponent active only,
      // but we demonstrate prompt structure for later bench targeting)
      const opponentId = otherPlayerId(state, action.playerId);
      const opponent = getPlayer(state, opponentId);
      const oppActive = opponent.active;

      if (!oppActive) {
        reject(state, events, "Opponent has no active Pokémon.");
        return null;
      }

      const prompt: Prompt = {
        id: createId(state, "prompt"),
        kind: "CHOOSE_TARGET",
        playerId: action.playerId,
        message: "Choose an opponent Pokémon to attack.",
        candidates: [{ kind: "card", instanceId: oppActive }],
        continuation: { type: "ATTACK_DAMAGE", source: attackerRef, damage: 20 },
      };

      return [{ type: "CREATE_PROMPT", prompt }];
    }

    case "RESOLVE_PROMPT": {
      const p = state.prompt;
      if (!p) {
        reject(state, events, "No prompt to resolve.");
        return null;
      }
      if (p.id !== action.promptId) {
        reject(state, events, "Prompt id mismatch.");
        return null;
      }

      // Validate choice is allowed
      if (!p.candidates.some((c) => c.kind === action.choice.kind && c.instanceId === action.choice.instanceId)) {
        reject(state, events, "Invalid choice.");
        return null;
      }

      // Convert continuation into concrete effects
      const cont = p.continuation;
      const target = action.choice;

      const effects: Effect[] = [{ type: "CLEAR_PROMPT", promptId: p.id }];

      if (cont.type === "ATTACK_DAMAGE" || cont.type === "CARD_EFFECT_DAMAGE") {
        effects.push({
          type: "DEAL_DAMAGE",
          source: cont.source,
          target,
          amount: cont.damage,
        });
        // Typically attack ends turn or moves to END phase:
        effects.push({ type: "SET_PHASE", phase: "END" });
      }

      return effects;
    }
  }
}

function otherPlayerId(state: GameState, playerId: PlayerID): PlayerID {
  const ids = Object.keys(state.players);
  const other = ids.find((id) => id !== playerId);
  if (!other) throw new Error("Need 2 players for MVP.");
  return other;
}

function resolveEffects(state: GameState, events: GameEvent[]) {
  while (state.effectQueue.length > 0 && !state.prompt) {
    const eff = state.effectQueue.shift()!;
    applyEffect(state, eff, events);
  }
}

function applyEffect(state: GameState, eff: Effect, events: GameEvent[]) {
  switch (eff.type) {
    case "SET_PHASE": {
      state.turn.phase = eff.phase;
      events.push({ type: "PHASE_CHANGED", phase: eff.phase });
      return;
    }

    case "DRAW": {
      const ps = getPlayer(state, eff.playerId);
      for (let i = 0; i < eff.count; i++) {
        const top = ps.deck.shift();
        if (!top) break;
        ps.hand.push(top);
        getCard(state, top).zone = "HAND";
        events.push({ type: "CARD_MOVED", instanceId: top, from: "DECK", to: "HAND" });
      }
      return;
    }

    case "MOVE_CARD": {
      const inst = getCard(state, eff.instanceId);
      const from = inst.zone;
      moveInstanceBetweenZones(state, eff.instanceId, from, eff.to);
      events.push({ type: "CARD_MOVED", instanceId: eff.instanceId, from, to: eff.to });
      return;
    }

    case "DEAL_DAMAGE": {
      const targetInst = getCard(state, eff.target.instanceId);
      // MVP: store hp and counters; you may choose one representation
      targetInst.damageCounters += eff.amount;

      // If using hp, you can compute remaining:
      // remaining = (targetInst.maxHp ?? targetInst.hp ?? 0) - targetInst.damageCounters

      events.push({
        type: "DAMAGE_DEALT",
        source: eff.source,
        target: eff.target,
        amount: eff.amount,
      });
      return;
    }

    case "HEAL": {
      const targetInst = getCard(state, eff.target.instanceId);
      targetInst.damageCounters = Math.max(0, targetInst.damageCounters - eff.amount);
      events.push({ type: "HEALED", target: eff.target, amount: eff.amount });
      return;
    }

    case "CREATE_PROMPT": {
      state.prompt = eff.prompt;
      events.push({ type: "PROMPT_CREATED", prompt: eff.prompt });
      return;
    }

    case "CLEAR_PROMPT": {
      if (state.prompt?.id === eff.promptId) {
        state.prompt = null;
        events.push({ type: "PROMPT_CLEARED", promptId: eff.promptId });
      }
      return;
    }

    case "ADVANCE_TURN": {
      const ids = Object.keys(state.players);
      const idx = ids.indexOf(state.turn.activePlayerId);
      const next = ids[(idx + 1) % ids.length];
      if (!next) throw new Error("Failed to compute next player");
      state.turn.activePlayerId = next;
      state.turn.number += 1;
      events.push({
        type: "TURN_ADVANCED",
        activePlayerId: next,
        turnNumber: state.turn.number,
      });
      return;
    }
  }
}

function moveInstanceBetweenZones(state: GameState, instanceId: CardInstanceID, from: Zone, to: Zone) {
  const inst = getCard(state, instanceId);
  const owner = inst.ownerId;
  const ps = getPlayer(state, owner);

  const removeFromArray = (arr: CardInstanceID[]) => {
    const i = arr.indexOf(instanceId);
    if (i >= 0) arr.splice(i, 1);
  };

  // Remove from previous zone
  switch (from) {
    case "DECK":
      removeFromArray(ps.deck);
      break;
    case "HAND":
      removeFromArray(ps.hand);
      break;
    case "DISCARD":
      removeFromArray(ps.discard);
      break;
    case "BENCH":
      removeFromArray(ps.bench);
      break;
    case "ACTIVE":
      if (ps.active === instanceId) ps.active = undefined;
      break;
  }

  // Add to next zone
  switch (to) {
    case "DECK":
      ps.deck.unshift(instanceId); // MVP choice; use specific insert effects later
      break;
    case "HAND":
      ps.hand.push(instanceId);
      break;
    case "DISCARD":
      ps.discard.push(instanceId);
      break;
    case "BENCH":
      ps.bench.push(instanceId);
      break;
    case "ACTIVE":
      ps.active = instanceId;
      break;
  }

  inst.zone = to;
}

