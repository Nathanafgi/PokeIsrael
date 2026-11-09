import { useContext } from 'react'
import { PokemonCatalogContext } from './PokemonCatalogContext'

export function usePokemonCatalog() {
  const context = useContext(PokemonCatalogContext)

  if (!context) {
    throw new Error('usePokemonCatalog חייב להיות בתוך PokemonCatalogProvider.')
  }

  return context
}
