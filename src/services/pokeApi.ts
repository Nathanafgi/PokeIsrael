const POKEMON_LIST_URL = 'https://pokeapi.co/api/v2/pokemon?limit=100000'
const EVOLUTION_CHAIN_LIST_URL =
  'https://pokeapi.co/api/v2/evolution-chain?limit=10000'
const OFFICIAL_ARTWORK_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork'
const CACHE_KEY = 'pokeisrael-top-final-evolutions-v1'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000
const REQUEST_CONCURRENCY = 8
const TOP_POKEMON_COUNT = 50

interface ApiResource {
  name: string
  url: string
}

interface ApiListResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface EvolutionChainReference {
  url: string
}

interface PokemonApiResponse {
  id: number
  name: string
  species: ApiResource
  stats: { base_stat: number }[]
}

interface PokemonSpeciesApiResponse {
  name: string
  varieties: { is_default: boolean; pokemon: ApiResource }[]
}

interface EvolutionChainNode {
  species: ApiResource
  evolves_to: EvolutionChainNode[]
}

interface EvolutionChainApiResponse {
  chain: EvolutionChainNode
}

export interface PokemonListItem {
  id: number
  name: string
  imageUrl: string
  baseStatTotal: number
}

interface RankingCache {
  expiresAt: number
  pokemon: PokemonListItem[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
}

function isPositiveSafeInteger(value: unknown): value is number {
  return isNonNegativeSafeInteger(value) && value > 0
}

function isApiResource(value: unknown): value is ApiResource {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.url === 'string'
  )
}

function isApiListResponse<T>(
  value: unknown,
  isResult: (result: unknown) => result is T,
): value is ApiListResponse<T> {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    (typeof value.next === 'string' || value.next === null) &&
    (typeof value.previous === 'string' || value.previous === null) &&
    Array.isArray(value.results) &&
    value.results.every(isResult)
  )
}

function isEvolutionChainReference(
  value: unknown,
): value is EvolutionChainReference {
  return isRecord(value) && typeof value.url === 'string'
}

function isPokemonListResponse(
  value: unknown,
): value is ApiListResponse<ApiResource> {
  return isApiListResponse(value, isApiResource)
}

function isEvolutionChainListResponse(
  value: unknown,
): value is ApiListResponse<EvolutionChainReference> {
  return isApiListResponse(value, isEvolutionChainReference)
}

function isEvolutionChainNode(value: unknown): value is EvolutionChainNode {
  return (
    isRecord(value) &&
    isApiResource(value.species) &&
    Array.isArray(value.evolves_to) &&
    value.evolves_to.every(isEvolutionChainNode)
  )
}

function isEvolutionChainApiResponse(
  value: unknown,
): value is EvolutionChainApiResponse {
  return isRecord(value) && isEvolutionChainNode(value.chain)
}

function isPokemonApiResponse(value: unknown): value is PokemonApiResponse {
  return (
    isRecord(value) &&
    isPositiveSafeInteger(value.id) &&
    typeof value.name === 'string' &&
    isApiResource(value.species) &&
    Array.isArray(value.stats) &&
    value.stats.every(
      (stat) =>
        isRecord(stat) &&
        isNonNegativeSafeInteger(stat.base_stat),
    )
  )
}

function isPokemonSpeciesApiResponse(
  value: unknown,
): value is PokemonSpeciesApiResponse {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    Array.isArray(value.varieties) &&
    value.varieties.every(
      (variety) =>
        isRecord(variety) &&
        typeof variety.is_default === 'boolean' &&
        isApiResource(variety.pokemon),
    )
  )
}

function isPokemonListItem(value: unknown): value is PokemonListItem {
  return (
    isRecord(value) &&
    isPositiveSafeInteger(value.id) &&
    typeof value.name === 'string' &&
    typeof value.imageUrl === 'string' &&
    isPositiveSafeInteger(value.baseStatTotal)
  )
}

function isRankingCache(value: unknown): value is RankingCache {
  return (
    isRecord(value) &&
    typeof value.expiresAt === 'number' &&
    Array.isArray(value.pokemon) &&
    value.pokemon.length === TOP_POKEMON_COUNT &&
    value.pokemon.every(isPokemonListItem)
  )
}

async function fetchApiData<T>(
  url: string,
  isExpectedData: (value: unknown) => value is T,
  signal: AbortSignal,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if (signal.aborted) {
      throw error
    }

    throw new Error('לא ניתן להתחבר ל-PokeAPI. בדקו את החיבור ונסו שוב.', {
      cause: error,
    })
  }

  if (!response.ok) {
    const resourceName = url.split('/').filter(Boolean).at(-1)
    throw new Error(
      `טעינת נתוני ${resourceName ?? 'PokeAPI'} נכשלה (שגיאת שרת ${response.status}).`,
    )
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch (error) {
    throw new Error('התקבלה תשובה שלא ניתן לקרוא מ-PokeAPI.', {
      cause: error,
    })
  }

  if (!isExpectedData(payload)) {
    throw new Error('התקבלה תשובה לא תקינה מ-PokeAPI.')
  }

  return payload
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  callback: (item: T, signal: AbortSignal) => Promise<R>,
  signal: AbortSignal,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      if (signal.aborted) {
        throw new DOMException('הטעינה בוטלה.', 'AbortError')
      }

      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await callback(items[currentIndex], signal)
    }
  }

  const workerCount = Math.min(REQUEST_CONCURRENCY, items.length)
  await Promise.all(Array.from({ length: workerCount }, worker))
  return results
}

function getTerminalSpecies(node: EvolutionChainNode): ApiResource[] {
  if (node.evolves_to.length === 0) {
    return [node.species]
  }

  return node.evolves_to.flatMap(getTerminalSpecies)
}

function getMegaForms(
  speciesName: string,
  pokemonResources: ApiResource[],
): ApiResource[] {
  const suffixPattern = /^-mega(?:-[a-z]+)?$/u

  return pokemonResources.filter(
    (pokemon) =>
      pokemon.name.startsWith(`${speciesName}-`) &&
      suffixPattern.test(pokemon.name.slice(speciesName.length)),
  )
}

function toPokemonListItem(pokemon: PokemonApiResponse): PokemonListItem {
  return {
    id: pokemon.id,
    name: pokemon.name,
    imageUrl: `${OFFICIAL_ARTWORK_URL}/${pokemon.id}.png`,
    baseStatTotal: pokemon.stats.reduce(
      (total, stat) => total + stat.base_stat,
      0,
    ),
  }
}

function comparePokemonByBaseStats(
  first: PokemonListItem,
  second: PokemonListItem,
): number {
  return (
    second.baseStatTotal - first.baseStatTotal ||
    (first.name < second.name ? -1 : first.name > second.name ? 1 : 0) ||
    first.id - second.id
  )
}

export function rankPokemonByBaseStats(
  pokemon: readonly PokemonListItem[],
): PokemonListItem[] {
  return [...pokemon].sort(comparePokemonByBaseStats).slice(0, TOP_POKEMON_COUNT)
}

function readCachedRanking(): PokemonListItem[] | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(CACHE_KEY)

    if (stored === null) {
      return null
    }

    const cached: unknown = JSON.parse(stored)

    if (!isRankingCache(cached) || cached.expiresAt <= Date.now()) {
      window.localStorage.removeItem(CACHE_KEY)
      return null
    }

    return cached.pokemon
  } catch (error) {
    console.warn('לא ניתן לקרוא את מטמון דירוג הפוקימונים.', error)
    return null
  }
}

function writeCachedRanking(pokemon: PokemonListItem[]): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const cache: RankingCache = {
      expiresAt: Date.now() + CACHE_DURATION_MS,
      pokemon,
    }

    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.warn('לא ניתן לשמור את מטמון דירוג הפוקימונים.', error)
  }
}

export async function fetchTopPokemon(
  signal?: AbortSignal,
): Promise<PokemonListItem[]> {
  if (signal?.aborted) {
    throw new DOMException('הטעינה בוטלה.', 'AbortError')
  }

  const cachedRanking = readCachedRanking()

  if (cachedRanking) {
    return cachedRanking
  }

  const controller = new AbortController()
  const abortRequest = () => controller.abort()
  signal?.addEventListener('abort', abortRequest, { once: true })

  if (signal?.aborted) {
    controller.abort()
  }

  try {
    const [pokemonList, evolutionChainList] = await Promise.all([
      fetchApiData(
        POKEMON_LIST_URL,
        isPokemonListResponse,
        controller.signal,
      ),
      fetchApiData(
        EVOLUTION_CHAIN_LIST_URL,
        isEvolutionChainListResponse,
        controller.signal,
      ),
    ])

    const evolutionChains = await mapWithConcurrency(
      evolutionChainList.results,
      (chain) =>
        fetchApiData(
          chain.url,
          isEvolutionChainApiResponse,
          controller.signal,
        ),
      controller.signal,
    )

    const terminalSpecies = new Map<string, ApiResource>()

    for (const evolutionChain of evolutionChains) {
      for (const species of getTerminalSpecies(evolutionChain.chain)) {
        terminalSpecies.set(species.name, species)
      }
    }

    const terminalSpeciesDetails = await mapWithConcurrency(
      [...terminalSpecies.values()],
      (species) =>
        fetchApiData(
          species.url,
          isPokemonSpeciesApiResponse,
          controller.signal,
        ),
      controller.signal,
    )
    const candidateResourcesBySpecies: ApiResource[][] = []

    for (const species of terminalSpeciesDetails) {
      const defaultPokemon = species.varieties.find(
        (variety) => variety.is_default,
      )?.pokemon

      if (!defaultPokemon) {
        throw new Error(`לא נמצאה צורה רגילה עבור ${species.name}.`)
      }

      const megaForms = getMegaForms(species.name, pokemonList.results)
      candidateResourcesBySpecies.push(
        megaForms.length > 0 ? megaForms : [defaultPokemon],
      )
    }

    const candidatePokemon = await mapWithConcurrency(
      [
        ...new Map(
          candidateResourcesBySpecies
            .flat()
            .map((resource) => [resource.name, resource]),
        ).values(),
      ],
      (resource) =>
        fetchApiData(
          resource.url,
          isPokemonApiResponse,
          controller.signal,
        ),
      controller.signal,
    )

    const pokemonByName = new Map(
      candidatePokemon.map((pokemon) => {
        const listItem = toPokemonListItem(pokemon)
        return [listItem.name, listItem]
      }),
    )
    const eligiblePokemon = candidateResourcesBySpecies.map((candidateResources) => {
      const forms = candidateResources.map((resource) => {
        const pokemon = pokemonByName.get(resource.name)

        if (!pokemon) {
          throw new Error(`לא התקבלו נתוני סטאטים עבור ${resource.name}.`)
        }

        return pokemon
      })

      return [...forms].sort(comparePokemonByBaseStats)[0]
    })

    if (eligiblePokemon.length < TOP_POKEMON_COUNT) {
      throw new Error(
        `נמצאו רק ${eligiblePokemon.length} פוקימונים מתאימים לדירוג; נדרשים לפחות ${TOP_POKEMON_COUNT}.`,
      )
    }

    const rankedPokemon = rankPokemonByBaseStats(eligiblePokemon)

    writeCachedRanking(rankedPokemon)
    return rankedPokemon
  } catch (error) {
    controller.abort()
    throw error
  } finally {
    signal?.removeEventListener('abort', abortRequest)
  }
}
