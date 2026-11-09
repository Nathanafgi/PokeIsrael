import { useEffect, useState } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { fetchTopPokemon, type PokemonListItem } from './services/pokeApi'
import { useFavorites } from './useFavorites'
import { usePokemonCatalog } from './usePokemonCatalog'
import { filterPokemonByName } from './utils/pokemon'
import ComparisonPage from './ComparisonPage'
import FavoritesPage from './FavoritesPage'
import PokemonDetailPage from './PokemonDetailPage'
import './App.css'

type PokemonListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; pokemon: PokemonListItem[] }

function PokemonListPage() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<PokemonListState>({ status: 'loading' })
  const [searchQuery, setSearchQuery] = useState('')
  const { isFavorite, toggleFavorite } = useFavorites()
  const catalog = usePokemonCatalog()
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()

    async function loadPokemon() {
      setState({ status: 'loading' })

      try {
        const pokemon = await fetchTopPokemon(controller.signal)
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

  const visiblePokemon =
    state.status === 'success'
      ? filterPokemonByName(state.pokemon, searchQuery)
      : []
  const catalogSuggestions =
    catalog.status === 'success' && searchQuery.trim()
      ? filterPokemonByName(catalog.pokemon, searchQuery).slice(0, 20)
      : []

  function handleSearchChange(query: string) {
    setSearchQuery(query)

    if (catalog.status !== 'success') {
      return
    }

    const selectedPokemon = catalog.pokemon.find(
      (pokemon) =>
        pokemon.name.toLocaleLowerCase() ===
        query.trim().toLocaleLowerCase(),
    )

    if (selectedPokemon) {
      navigate(`/pokemon/${encodeURIComponent(selectedPokemon.name)}`)
    }
  }

  return (
    <main className="app-shell" dir="rtl">
      <header className="page-header">
        <p className="eyebrow">PokeIsrael</p>
        <h1>50 הפוקימונים עם הסטאטים הגבוהים ביותר</h1>
        <p className="intro">
          מוצגים הפוקימונים הסופיים בכל קו התפתחות, כולל צורות המגה החזקות ביותר.
        </p>
      </header>

      {state.status === 'loading' && (
        <section className="state-panel" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>מחשב את דירוג הפוקימונים...</p>
          <p className="loading-note">
            בטעינה הראשונה נבדקים נתוני ההתפתחויות והסטאטים מ-PokeAPI.
          </p>
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
            <h2 id="results-title">המובילים לפי סכום סטאטים בסיסיים</h2>
            <span>
              {visiblePokemon.length} מתוך {state.pokemon.length} פוקימונים
            </span>
          </div>
          <label className="search-field" htmlFor="pokemon-search">
            חיפוש לפי שם
            <input
              id="pokemon-search"
              type="search"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="לדוגמה, pikachu"
              list="pokemon-name-suggestions"
            />
          </label>
          {catalog.status === 'loading' && (
            <p className="loading-note" aria-live="polite">
              טוען שמות להשלמה אוטומטית...
            </p>
          )}
          {catalog.status === 'error' && (
            <p className="error-message" role="alert">
              לא ניתן לטעון את שמות הפוקימונים להשלמה אוטומטית:{' '}
              {catalog.message}
            </p>
          )}
          {catalog.status === 'success' && (
            <datalist id="pokemon-name-suggestions">
              {catalogSuggestions.map((pokemon) => (
                <option key={pokemon.name} value={pokemon.name} />
              ))}
            </datalist>
          )}
          {visiblePokemon.length > 0 ? (
            <ul className="pokemon-list">
              {visiblePokemon.map((pokemon) => (
                <li key={pokemon.id}>
                  <article className="pokemon-card">
                    <Link
                      className="pokemon-card-link"
                      to={`/pokemon/${encodeURIComponent(pokemon.name)}`}
                    >
                      <img
                        src={pokemon.imageUrl}
                        alt=""
                        loading="lazy"
                        width="120"
                        height="120"
                      />
                      <span className="pokemon-card-name">{pokemon.name}</span>
                    </Link>
                    <div className="pokemon-card-footer">
                      <strong
                        className="stat-total"
                        aria-label={`סכום סטאטים בסיסיים: ${pokemon.baseStatTotal}`}
                      >
                        {pokemon.baseStatTotal}
                      </strong>
                      <button
                        className="favorite-button"
                        type="button"
                        aria-pressed={isFavorite(pokemon.id)}
                        aria-label={`${isFavorite(pokemon.id) ? 'הסרת' : 'הוספת'} ${pokemon.name} ${isFavorite(pokemon.id) ? 'מהמועדפים' : 'למועדפים'}`}
                        onClick={() => toggleFavorite(pokemon)}
                      >
                        {isFavorite(pokemon.id) ? '♥' : '♡'}
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          ) : state.pokemon.length > 0 ? (
            <p className="empty-message">לא נמצאו פוקימונים התואמים לחיפוש.</p>
          ) : (
            <p className="empty-message">לא נמצאו פוקימונים להצגה.</p>
          )}
        </section>
      )}
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="app-shell" dir="rtl">
      <section className="state-panel">
        <h1>העמוד לא נמצא</h1>
        <Link className="pokemon-link" to="/">
          חזרה לרשימת הפוקימונים
        </Link>
      </section>
    </main>
  )
}

function App() {
  const { pokemon, storageError } = useFavorites()

  return (
    <>
      <nav className="site-navigation" dir="rtl" aria-label="ניווט ראשי">
        <Link to="/">רשימת הפוקימונים</Link>
        <Link to="/favorites">מועדפים ({pokemon.length})</Link>
        <Link to="/compare">השוואה</Link>
      </nav>
      {storageError && (
        <p className="storage-error" role="alert">
          {storageError}
        </p>
      )}
      <Routes>
        <Route path="/" element={<PokemonListPage />} />
        <Route path="/pokemon/:name" element={<PokemonDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/compare" element={<ComparisonPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
