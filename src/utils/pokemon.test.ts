import { describe, expect, it } from 'vitest'
import type { PokemonListItem } from '../services/pokeApi'
import { filterPokemonByName } from './pokemon'
import { rankPokemonByBaseStats } from '../services/pokeApi'

function createPokemon(
  id: number,
  name: string,
  baseStatTotal: number,
): PokemonListItem {
  return {
    id,
    name,
    imageUrl: `https://example.test/${id}.png`,
    baseStatTotal,
  }
}

describe('filterPokemonByName', () => {
  const pokemon = [
    createPokemon(25, 'pikachu', 320),
    createPokemon(26, 'raichu', 485),
    createPokemon(6, 'charizard', 534),
  ]

  it('filters names without case sensitivity', () => {
    expect(filterPokemonByName(pokemon, 'PIKA')).toEqual([pokemon[0]])
  })

  it('trims whitespace around the query', () => {
    expect(filterPokemonByName(pokemon, '  char  ')).toEqual([pokemon[2]])
  })

  it('returns a copy of the full list for an empty query', () => {
    const result = filterPokemonByName(pokemon, '   ')

    expect(result).toEqual(pokemon)
    expect(result).not.toBe(pokemon)
  })

  it('returns an empty list when no names match', () => {
    expect(filterPokemonByName(pokemon, 'mewtwo')).toEqual([])
  })

  it('filters lightweight name and URL catalog entries', () => {
    const catalog = [
      { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
      { name: 'charizard', url: 'https://pokeapi.co/api/v2/pokemon/6/' },
    ]

    expect(filterPokemonByName(catalog, 'char')).toEqual([catalog[1]])
  })
})

describe('rankPokemonByBaseStats', () => {
  it('sorts by descending stat total and resolves ties by name then id', () => {
    const pokemon = [
      createPokemon(2, 'zubat', 200),
      createPokemon(4, 'abra', 300),
      createPokemon(3, 'abra', 300),
      createPokemon(1, 'pikachu', 250),
    ]

    expect(rankPokemonByBaseStats(pokemon)).toEqual([
      pokemon[2],
      pokemon[1],
      pokemon[3],
      pokemon[0],
    ])
  })

  it('does not mutate the input list', () => {
    const pokemon = [
      createPokemon(1, 'pikachu', 320),
      createPokemon(2, 'raichu', 485),
    ]
    const originalOrder = [...pokemon]

    rankPokemonByBaseStats(pokemon)

    expect(pokemon).toEqual(originalOrder)
  })

  it('returns at most the top 50 Pokemon', () => {
    const pokemon = Array.from({ length: 60 }, (_, index) =>
      createPokemon(index + 1, `pokemon-${index + 1}`, index + 1),
    )

    const ranked = rankPokemonByBaseStats(pokemon)

    expect(ranked).toHaveLength(50)
    expect(ranked[0].baseStatTotal).toBe(60)
    expect(ranked[49].baseStatTotal).toBe(11)
  })
})
