import { createContext } from 'react'
import type { PokemonListItem } from './services/pokeApi'

export interface FavoritesState {
  pokemon: PokemonListItem[]
  storageError: string | null
}

export interface FavoritesContextValue extends FavoritesState {
  isFavorite: (pokemonId: number) => boolean
  toggleFavorite: (pokemon: PokemonListItem) => void
  removeFavorite: (pokemonId: number) => void
}

export const FavoritesContext =
  createContext<FavoritesContextValue | null>(null)
