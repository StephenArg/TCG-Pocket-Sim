import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import type { GameEvent, GameState } from "@pocket/shared";
import type { User, Deck } from "@pocket/shared";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

type AppState = {
  // identity / lobby
  user: User | null;
  setUser: (user: User | null) => void;

  decks: Deck[];
  addDeck: (deck: Deck) => void;
  removeDeck: (deck: Deck) => void;
  updateDeck: (deck: Deck) => void;
  clearDecks: () => void;
  /** True after persist has loaded from localStorage (use to avoid flashing "no user" on refresh). */
  _hasHydrated: boolean;
  _setHasHydrated: (value: boolean) => void;

  // room
  roomId: string | null;
  setRoomId: (roomId: string | null) => void;

  // connection
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (s: ConnectionStatus) => void;

  // server-driven game data
  snapshot: GameState | null;
  setSnapshot: (s: GameState | null) => void;

  // transient event batch for animations/logging
  // (store batches, not an ever-growing log)
  eventsBatch: GameEvent[];
  eventsBatchSeq: number;
  setEventsBatch: (events: GameEvent[]) => void;
  clearEventsBatch: () => void;

  // errors
  lastError: string | null;
  setLastError: (msg: string | null) => void;

  // convenience
  resetGame: () => void;
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        user: null,
        setUser: (user) => set({ user }),

        decks: [],
        addDeck: (deck) => set({ decks: [...get().decks, deck] }),
        removeDeck: (deck) => set({ decks: get().decks.filter(d => d.id !== deck.id) }),
        updateDeck: (deck) => set({ decks: get().decks.map(d => d.id === deck.id ? deck : d) }),
        clearDecks: () => set({ decks: [] }),

        _hasHydrated: false,
        _setHasHydrated: (value) => set({ _hasHydrated: value }),

        roomId: null,
        setRoomId: (roomId) => set({ roomId }),

        connectionStatus: "disconnected",
        setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

        snapshot: null,
        setSnapshot: (snapshot) => set({ snapshot }),

        eventsBatch: [],
        eventsBatchSeq: 0,
        setEventsBatch: (events) =>
          set({
            eventsBatch: events,
            eventsBatchSeq: get().eventsBatchSeq + 1,
          }),
        clearEventsBatch: () => set({ eventsBatch: [] }),

        lastError: null,
        setLastError: (lastError) => set({ lastError }),

        resetGame: () =>
          set({
            snapshot: null,
            eventsBatch: [],
            lastError: null,
            roomId: null,
            connectionStatus: "disconnected",
          }),
      })),
      {
        name: "tcgp-app", // localStorage key
        // Persist only user/lobby stuff; do NOT persist game snapshots.
        partialize: (s) => ({ user: s.user ? s.user : null, decks: s.decks ? s.decks : [] }),
        onRehydrateStorage: () => (state) => {
          state?._setHasHydrated(true);
        },
      },
    ),
    { name: "AppStore" }
  )
);

