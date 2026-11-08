const POKEMON_LIST_URL = 'https://pokeapi.co/api/v2/pokemon?limit=60'
const OFFICIAL_ARTWORK_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork'

export interface PokemonApiListItem {
  name: string
  url: string
}

export interface PokemonApiListResponse {
  count: number
  next: string | null
  previous: string | null
  results: PokemonApiListItem[]
}

export interface PokemonListItem extends PokemonApiListItem {
  id: number
  imageUrl: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPokemonApiListItem(value: unknown): value is PokemonApiListItem {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.url === 'string'
  )
}

function isPokemonApiListResponse(
  value: unknown,
): value is PokemonApiListResponse {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    (typeof value.next === 'string' || value.next === null) &&
    (typeof value.previous === 'string' || value.previous === null) &&
    Array.isArray(value.results) &&
    value.results.every(isPokemonApiListItem)
  )
}

function toPokemonListItem(pokemon: PokemonApiListItem): PokemonListItem {
  const idMatch = /\/pokemon\/(\d+)\/?$/u.exec(pokemon.url)
  const id = idMatch ? Number(idMatch[1]) : Number.NaN

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error(`לא ניתן לזהות את מספר הפוקימון: ${pokemon.name}.`)
  }

  return {
    ...pokemon,
    id,
    imageUrl: `${OFFICIAL_ARTWORK_URL}/${id}.png`,
  }
}

export async function fetchPokemonList(
  signal?: AbortSignal,
): Promise<PokemonListItem[]> {
  let response: Response

  try {
    response = await fetch(POKEMON_LIST_URL, { signal })
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }

    throw new Error('לא ניתן להתחבר ל-PokeAPI. בדקו את החיבור ונסו שוב.', {
      cause: error,
    })
  }

  if (!response.ok) {
    throw new Error(`טעינת הפוקימונים נכשלה (שגיאת שרת ${response.status}).`)
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch (error) {
    throw new Error('התקבלה תשובה שלא ניתן לקרוא מ-PokeAPI.', {
      cause: error,
    })
  }

  if (!isPokemonApiListResponse(payload)) {
    throw new Error('התקבלה תשובה לא תקינה מ-PokeAPI.')
  }

  return payload.results.map(toPokemonListItem)
}
