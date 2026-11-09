export function filterPokemonByName<T extends { name: string }>(
  pokemon: readonly T[],
  query: string,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    return [...pokemon]
  }

  return pokemon.filter((item) =>
    item.name.toLocaleLowerCase().includes(normalizedQuery),
  )
}
