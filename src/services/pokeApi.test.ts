import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPokemonCatalog } from './pokeApi'

describe('fetchPokemonCatalog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches the lightweight catalog with names and URLs only', async () => {
    const pokemon = [
      { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
      { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon/26/' },
    ]
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          count: pokemon.length,
          next: null,
          previous: null,
          results: pokemon,
        }),
        { status: 200 },
      ),
    )

    await expect(
      fetchPokemonCatalog(new AbortController().signal),
    ).resolves.toEqual(pokemon)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://pokeapi.co/api/v2/pokemon?limit=2000',
    )
  })

  it('rejects a partial catalog instead of silently omitting Pokemon', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 3,
          next: 'https://pokeapi.co/api/v2/pokemon?offset=2&limit=2',
          previous: null,
          results: [
            { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
            { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon/26/' },
          ],
        }),
        { status: 200 },
      ),
    )

    await expect(
      fetchPokemonCatalog(new AbortController().signal),
    ).rejects.toThrow('לא ניתן לטעון את רשימת כל הפוקימונים.')
  })
})
