import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFavorites } from './useFavorites'
import {
  fetchPokemonDetails,
  fetchPokemonMoveDetails,
  type PokemonDetails,
  type PokemonListItem,
  type PokemonMoveDetails,
} from './services/pokeApi'
import './PokemonDetailPage.css'

type PokemonDetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      pokemon: PokemonDetails
      strongestMoves: PokemonMoveDetails[]
    }

const MOVE_REQUEST_CONCURRENCY = 8

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Special Attack',
  'special-defense': 'Special Defense',
  speed: 'Speed',
}

function formatName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function fetchStrongestMoves(
  moves: PokemonDetails['moves'],
  signal: AbortSignal,
): Promise<PokemonMoveDetails[]> {
  const uniqueMoves = [...new Map(moves.map((move) => [move.url, move])).values()]
  const moveDetails: PokemonMoveDetails[] = []

  for (
    let index = 0;
    index < uniqueMoves.length;
    index += MOVE_REQUEST_CONCURRENCY
  ) {
    const batch = uniqueMoves.slice(index, index + MOVE_REQUEST_CONCURRENCY)
    const results = await Promise.all(
      batch.map(({ url }) => fetchPokemonMoveDetails(url, signal)),
    )

    moveDetails.push(
      ...results.filter(
        (move): move is PokemonMoveDetails => move !== null,
      ),
    )
  }

  return moveDetails
    .sort(
      (first, second) =>
        second.power - first.power ||
        first.name.localeCompare(second.name),
    )
    .slice(0, 4)
}

function PokemonDetailPage() {
  const { name } = useParams<{ name: string }>()
  const [state, setState] = useState<PokemonDetailState>({ status: 'loading' })
  const { isFavorite, toggleFavorite } = useFavorites()

  useEffect(() => {
    const controller = new AbortController()

    async function loadPokemon() {
      setState({ status: 'loading' })

      try {
        if (!name) {
          throw new Error('לא צוין שם של פוקימון.')
        }

        const pokemon = await fetchPokemonDetails(name, controller.signal)
        const strongestMoves = await fetchStrongestMoves(
          pokemon.moves,
          controller.signal,
        )

        setState({ status: 'success', pokemon, strongestMoves })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        controller.abort()
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'אירעה שגיאה לא צפויה בעת טעינת פרטי הפוקימון.',
        })
      }
    }

    void loadPokemon()
    return () => controller.abort()
  }, [name])

  const favoritePokemon: PokemonListItem | null =
    state.status === 'success'
      ? {
          id: state.pokemon.id,
          name: state.pokemon.name,
          imageUrl: state.pokemon.imageUrl,
          baseStatTotal: state.pokemon.stats.reduce(
            (total, stat) => total + stat.baseStat,
            0,
          ),
        }
      : null

  return (
    <main className="app-shell detail-page" dir="rtl">
      <Link className="back-link" to="/">
        חזרה לרשימת הפוקימונים
      </Link>

      {state.status === 'loading' && (
        <section className="state-panel" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>טוען פרטי פוקימון ומחשב את המתקפות החזקות ביותר...</p>
        </section>
      )}

      {state.status === 'error' && (
        <section className="state-panel error-panel" role="alert">
          <h1>לא הצלחנו לטעון את פרטי הפוקימון</h1>
          <p>{state.message}</p>
        </section>
      )}

      {state.status === 'success' && (
        <>
          <header className="detail-header">
            <img
              className="detail-image"
              src={state.pokemon.imageUrl}
              alt={formatName(state.pokemon.name)}
            />
            <div>
              <p className="eyebrow">פוקימון #{state.pokemon.id}</p>
              <h1>{formatName(state.pokemon.name)}</h1>
              <p className="type-list">
                {state.pokemon.types.map(formatName).join(' · ')}
              </p>
              {favoritePokemon && (
                <button
                  className="favorite-button detail-favorite-button"
                  type="button"
                  aria-pressed={isFavorite(state.pokemon.id)}
                  onClick={() => toggleFavorite(favoritePokemon)}
                >
                  {isFavorite(state.pokemon.id)
                    ? 'הסרה מהמועדפים'
                    : 'הוספה למועדפים'}
                </button>
              )}
            </div>
          </header>

          <section className="detail-section" aria-labelledby="overview-title">
            <h2 id="overview-title">נתונים כלליים</h2>
            <dl className="overview-grid">
              <div>
                <dt>גובה</dt>
                <dd>{(state.pokemon.height / 10).toFixed(1)} מ׳</dd>
              </div>
              <div>
                <dt>משקל</dt>
                <dd>{(state.pokemon.weight / 10).toFixed(1)} ק״ג</dd>
              </div>
              <div>
                <dt>ניסיון בסיסי</dt>
                <dd>{state.pokemon.baseExperience ?? 'לא זמין'}</dd>
              </div>
            </dl>
          </section>

          <section className="detail-section" aria-labelledby="abilities-title">
            <h2 id="abilities-title">יכולות</h2>
            <ul className="tag-list">
              {state.pokemon.abilities.map((ability) => (
                <li key={ability.name}>
                  {formatName(ability.name)}
                  {ability.isHidden && <span> (נסתרת)</span>}
                </li>
              ))}
            </ul>
          </section>

          <section className="detail-section" aria-labelledby="stats-title">
            <h2 id="stats-title">סטטיסטיקות בסיסיות</h2>
            <dl className="stats-list">
              {state.pokemon.stats.map((stat) => (
                <div className="stat-row" key={stat.name}>
                  <dt>{STAT_LABELS[stat.name] ?? formatName(stat.name)}</dt>
                  <dd>{stat.baseStat}</dd>
                  <span>מאמץ: {stat.effort}</span>
                </div>
              ))}
            </dl>
          </section>

          <section className="detail-section" aria-labelledby="moves-title">
            <h2 id="moves-title">ארבע המתקפות החזקות ביותר</h2>
            {state.strongestMoves.length > 0 ? (
              <ol className="strongest-moves">
                {state.strongestMoves.map((move) => (
                  <li key={move.name}>
                    <span>{formatName(move.name)}</span>
                    <strong>Power {move.power}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-message">
                לא נמצאו מתקפות בעלות Power מספרי.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default PokemonDetailPage
