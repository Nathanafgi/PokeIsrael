import { useState, type ReactNode } from 'react'
import {
  FavoritesContext,
  type FavoritesState,
  type FavoritesContextValue,
} from './FavoritesContext'
import type { PokemonListItem } from './services/pokeApi'

const FAVORITES_STORAGE_KEY = 'pokeisrael-favorites-v1'

function isPokemonListItem(value: unknown): value is PokemonListItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'name' in value &&
    typeof value.name === 'string' &&
    'imageUrl' in value &&
    typeof value.imageUrl === 'string' &&
    'baseStatTotal' in value &&
    typeof value.baseStatTotal === 'number' &&
    Number.isSafeInteger(value.baseStatTotal) &&
    value.baseStatTotal > 0
  )
}

function loadFavorites(): FavoritesState {
  if (typeof window === 'undefined') {
    return { pokemon: [], storageError: null }
  }

  try {
    const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY)

    if (stored === null) {
      return { pokemon: [], storageError: null }
    }

    const parsed: unknown = JSON.parse(stored)

    if (!Array.isArray(parsed) || !parsed.every(isPokemonListItem)) {
      return {
        pokemon: [],
        storageError: 'נתוני המועדפים השמורים אינם תקינים.',
      }
    }

    return {
      pokemon: [...new Map(parsed.map((pokemon) => [pokemon.id, pokemon])).values()],
      storageError: null,
    }
  } catch (error) {
    console.error('לא ניתן לטעון את המועדפים מ-localStorage.', error)
    return {
      pokemon: [],
      storageError: 'לא ניתן לטעון את המועדפים מהאחסון המקומי.',
    }
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FavoritesState>(loadFavorites)

  function saveFavorites(pokemon: PokemonListItem[]) {
    try {
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(pokemon),
      )
      setState({ pokemon, storageError: null })
    } catch (error) {
      console.error('לא ניתן לשמור את המועדפים ב-localStorage.', error)
      setState({
        pokemon,
        storageError:
          'לא ניתן לשמור את המועדפים. השינוי נשמר בזיכרון זמנית בלבד.',
      })
    }
  }

  function toggleFavorite(pokemon: PokemonListItem) {
    const nextPokemon = state.pokemon.some((favorite) => favorite.id === pokemon.id)
      ? state.pokemon.filter((favorite) => favorite.id !== pokemon.id)
      : [...state.pokemon, pokemon]

    saveFavorites(nextPokemon)
  }

  function removeFavorite(pokemonId: number) {
    saveFavorites(state.pokemon.filter((pokemon) => pokemon.id !== pokemonId))
  }

  const value: FavoritesContextValue = {
    ...state,
    isFavorite: (pokemonId) =>
      state.pokemon.some((pokemon) => pokemon.id === pokemonId),
    toggleFavorite,
    removeFavorite,
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}
