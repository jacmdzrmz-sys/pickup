'use client';

import { create } from 'zustand';
import { Game, Court } from '@/types';

interface GameState {
  games: Game[];
  selectedGame: Game | null;
  isLoading: boolean;
  error: string | null;
  setGames: (games: Game[]) => void;
  setSelectedGame: (game: Game | null) => void;
  addGame: (game: Game) => void;
  removeGame: (gameId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  games: [],
  selectedGame: null,
  isLoading: false,
  error: null,

  setGames: (games: Game[]) => set({ games }),
  setSelectedGame: (game: Game | null) => set({ selectedGame: game }),
  addGame: (game: Game) =>
    set((state) => ({ games: [...state.games, game] })),
  removeGame: (gameId: string) =>
    set((state) => ({
      games: state.games.filter((g) => g.id !== gameId),
    })),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
}));

interface CourtState {
  courts: Court[];
  selectedCourt: Court | null;
  isLoading: boolean;
  error: string | null;
  setCourts: (courts: Court[]) => void;
  setSelectedCourt: (court: Court | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCourtStore = create<CourtState>((set) => ({
  courts: [],
  selectedCourt: null,
  isLoading: false,
  error: null,

  setCourts: (courts: Court[]) => set({ courts }),
  setSelectedCourt: (court: Court | null) => set({ selectedCourt: court }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
}));
