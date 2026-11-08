import { useEffect, useState } from 'react'
import { fetchPokemonList, type PokemonListItem } from './services/pokeApi'
import './App.css'

type PokemonListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; pokemon: PokemonListItem[] }

function App() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<PokemonListState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadPokemon() {
      setState({ status: 'loading' })

      try {
        const pokemon = await fetchPokemonList(controller.signal)
        setState({ status: 'success', pokemon })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'אירעה שגיאה לא צפויה בעת טעינת הפוקימונים.',
        })
      }
    }

    void loadPokemon()
    return () => controller.abort()
  }, [attempt])

  return (
    <main className="app-shell" dir="rtl">
      <header className="page-header">
        <p className="eyebrow">PokeIsrael</p>
        <h1>הפוקידקס שלי</h1>
        <p className="intro">רשימת הפוקימונים הראשונה שלך, ישירות מ-PokeAPI.</p>
      </header>

      {state.status === 'loading' && (
        <section className="state-panel" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>טוען פוקימונים...</p>
        </section>
      )}

      {state.status === 'error' && (
        <section className="state-panel error-panel" role="alert">
          <h2>לא הצלחנו לטעון את הפוקימונים</h2>
          <p>{state.message}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            לנסות שוב
          </button>
        </section>
      )}

      {state.status === 'success' && (
        <section className="results" aria-labelledby="results-title">
          <div className="results-heading">
            <h2 id="results-title">רשימת פוקימונים</h2>
            <span>{state.pokemon.length} פוקימונים</span>
          </div>
          {state.pokemon.length > 0 ? (
            <ul className="pokemon-list">
              {state.pokemon.map((pokemon) => (
                <li key={pokemon.id}>{pokemon.name}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-message">לא נמצאו פוקימונים להצגה.</p>
          )}
        </section>
      )}
    </main>
  )
}

export default App
