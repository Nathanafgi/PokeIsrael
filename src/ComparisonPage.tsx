import { useEffect, useState } from 'react'
import {
  fetchPokemonDetails,
  fetchTopPokemon,
  type PokemonDetails,
  type PokemonListItem,
} from './services/pokeApi'
import './ComparisonPage.css'

type PokemonListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; pokemon: PokemonListItem[] }

type ComparisonState =
  | { status: 'idle' }
  | { status: 'loading'; firstId: string; secondId: string }
  | {
      status: 'error'
      firstId: string
      secondId: string
      message: string
    }
  | {
      status: 'success'
      firstId: string
      secondId: string
      pokemon: [PokemonDetails, PokemonDetails]
    }

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Special Attack',
  'special-defense': 'Special Defense',
  speed: 'Speed',
}

const SUMMARY_STATS = [
  { name: 'speed', label: 'מהירות' },
  { name: 'attack', label: 'Attack' },
  { name: 'special-attack', label: 'Special Attack' },
  { name: 'hp', label: 'HP' },
]

function formatName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getStatValue(pokemon: PokemonDetails, statName: string): number {
  return pokemon.stats.find((stat) => stat.name === statName)?.baseStat ?? 0
}

function ComparisonPage() {
  const [roster, setRoster] = useState<PokemonListState>({ status: 'loading' })
  const [firstId, setFirstId] = useState('')
  const [secondId, setSecondId] = useState('')
  const [comparison, setComparison] = useState<ComparisonState>({
    status: 'idle',
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadRoster() {
      try {
        const pokemon = await fetchTopPokemon(controller.signal)
        setRoster({ status: 'success', pokemon })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setRoster({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'אירעה שגיאה לא צפויה בעת טעינת הפוקימונים.',
        })
      }
    }

    void loadRoster()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!firstId || !secondId) {
      return
    }

    const controller = new AbortController()

    async function loadComparison() {
      setComparison({ status: 'loading', firstId, secondId })

      try {
        if (firstId === secondId) {
          throw new Error('יש לבחור שני פוקימונים שונים להשוואה.')
        }

        const firstPokemon =
          roster.status === 'success'
            ? roster.pokemon.find((pokemon) => String(pokemon.id) === firstId)
            : undefined
        const secondPokemon =
          roster.status === 'success'
            ? roster.pokemon.find((pokemon) => String(pokemon.id) === secondId)
            : undefined

        if (!firstPokemon || !secondPokemon) {
          throw new Error('לא נמצאו פרטי שני הפוקימונים שנבחרו.')
        }

        const [firstDetails, secondDetails] = await Promise.all([
          fetchPokemonDetails(firstPokemon.name, controller.signal),
          fetchPokemonDetails(secondPokemon.name, controller.signal),
        ])

        setComparison({
          status: 'success',
          firstId,
          secondId,
          pokemon: [firstDetails, secondDetails],
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        controller.abort()
        setComparison({
          status: 'error',
          firstId,
          secondId,
          message:
            error instanceof Error
              ? error.message
              : 'אירעה שגיאה לא צפויה בעת טעינת נתוני ההשוואה.',
        })
      }
    }

    void loadComparison()
    return () => controller.abort()
  }, [firstId, secondId, roster])

  const activeComparison =
    comparison.status !== 'idle' &&
    comparison.firstId === firstId &&
    comparison.secondId === secondId

  return (
    <main className="app-shell comparison-page" dir="rtl">
      <header className="page-header">
        <p className="eyebrow">PokeIsrael</p>
        <h1>השוואת פוקימונים</h1>
        <p className="intro">בחרו שני פוקימונים והשוו בין הסטטיסטיקות הבסיסיות שלהם.</p>
      </header>

      {roster.status === 'loading' && (
        <section className="state-panel" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>טוען את רשימת הפוקימונים להשוואה...</p>
        </section>
      )}

      {roster.status === 'error' && (
        <section className="state-panel error-panel" role="alert">
          <h2>לא הצלחנו לטעון את הפוקימונים</h2>
          <p>{roster.message}</p>
        </section>
      )}

      {roster.status === 'success' && (
        <>
          <section className="comparison-selectors" aria-label="בחירת פוקימונים">
            <label>
              פוקימון ראשון
              <select
                value={firstId}
                onChange={(event) => setFirstId(event.target.value)}
              >
                <option value="">בחירת פוקימון</option>
                {roster.pokemon
                  .filter((pokemon) => String(pokemon.id) !== secondId)
                  .map((pokemon) => (
                    <option key={pokemon.id} value={pokemon.id}>
                      {formatName(pokemon.name)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              פוקימון שני
              <select
                value={secondId}
                onChange={(event) => setSecondId(event.target.value)}
              >
                <option value="">בחירת פוקימון</option>
                {roster.pokemon
                  .filter((pokemon) => String(pokemon.id) !== firstId)
                  .map((pokemon) => (
                    <option key={pokemon.id} value={pokemon.id}>
                      {formatName(pokemon.name)}
                    </option>
                  ))}
              </select>
            </label>
          </section>

          {activeComparison && comparison.status === 'loading' && (
            <section className="state-panel" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              <p>טוען נתונים להשוואה...</p>
            </section>
          )}

          {activeComparison && comparison.status === 'error' && (
            <section className="state-panel error-panel" role="alert">
              <p>{comparison.message}</p>
            </section>
          )}

          {activeComparison && comparison.status === 'success' && (
            <>
              <section className="comparison-results" aria-labelledby="stats-title">
                <h2 id="stats-title">סטטיסטיקות בסיסיות</h2>
                <div className="comparison-table-wrap">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th scope="col">נתון</th>
                        {comparison.pokemon.map((pokemon) => (
                          <th scope="col" key={pokemon.id}>
                            {formatName(pokemon.name)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.pokemon[0].stats.map((stat) => (
                        <tr key={stat.name}>
                          <th scope="row">
                            {STAT_LABELS[stat.name] ?? formatName(stat.name)}
                          </th>
                          {comparison.pokemon.map((pokemon) => (
                            <td key={pokemon.id}>
                              {getStatValue(pokemon, stat.name)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="comparison-total">
                        <th scope="row">סך הכול</th>
                        {comparison.pokemon.map((pokemon) => (
                          <td key={pokemon.id}>
                            {pokemon.stats.reduce(
                              (total, stat) => total + stat.baseStat,
                              0,
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="comparison-results" aria-labelledby="summary-title">
                <h2 id="summary-title">סיכום ההשוואה</h2>
                <ul className="comparison-summary">
                  {SUMMARY_STATS.map(({ name, label }) => {
                    const firstValue = getStatValue(comparison.pokemon[0], name)
                    const secondValue = getStatValue(comparison.pokemon[1], name)
                    const winner =
                      firstValue === secondValue
                        ? 'תיקו'
                        : formatName(
                            comparison.pokemon[
                              firstValue > secondValue ? 0 : 1
                            ].name,
                          )

                    return (
                      <li key={name}>
                        <strong>{label}:</strong> {winner}
                        {winner !== 'תיקו' && (
                          <span>
                            {' '}
                            ({Math.max(firstValue, secondValue)} מול{' '}
                            {Math.min(firstValue, secondValue)})
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </main>
  )
}

export default ComparisonPage
