import { createContext } from 'react'
import type { PokemonCatalogItem } from './services/pokeApi'

export type PokemonCatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; pokemon: PokemonCatalogItem[] }

export const PokemonCatalogContext =
  createContext<PokemonCatalogState | null>(null)
