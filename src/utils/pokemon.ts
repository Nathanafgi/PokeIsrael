import type { PokemonListItem } from '../services/pokeApi'

export function filterPokemonByName(
  pokemon: readonly PokemonListItem[],
  query: string,
): PokemonListItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    return [...pokemon]
  }

  return pokemon.filter((item) =>
    item.name.toLocaleLowerCase().includes(normalizedQuery),
  )
}
