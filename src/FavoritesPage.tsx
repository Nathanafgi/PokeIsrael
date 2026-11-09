import { Link } from 'react-router-dom'
import { useFavorites } from './useFavorites'

function formatName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function FavoritesPage() {
  const { pokemon, removeFavorite } = useFavorites()

  return (
    <main className="app-shell" dir="rtl">
      <header className="page-header">
        <p className="eyebrow">PokeIsrael</p>
        <h1>הפוקימונים המועדפים שלי</h1>
        <p className="intro">{pokemon.length} פוקימונים שמורים במועדפים.</p>
      </header>

      {pokemon.length > 0 ? (
        <ul className="favorites-list">
          {pokemon.map((favorite) => (
            <li className="favorite-item" key={favorite.id}>
              <img src={favorite.imageUrl} alt="" width="80" height="80" />
              <Link
                className="pokemon-link"
                to={`/pokemon/${encodeURIComponent(favorite.name)}`}
              >
                {formatName(favorite.name)}
              </Link>
              <strong
                className="stat-total"
                aria-label={`סכום סטאטים בסיסיים: ${favorite.baseStatTotal}`}
              >
                {favorite.baseStatTotal}
              </strong>
              <button
                className="favorite-button"
                type="button"
                onClick={() => removeFavorite(favorite.id)}
                aria-label={`הסרת ${formatName(favorite.name)} מהמועדפים`}
              >
                הסרה
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <section className="state-panel">
          <p>עדיין לא הוספת פוקימונים למועדפים.</p>
          <Link className="pokemon-link" to="/">
            מעבר לרשימת הפוקימונים
          </Link>
        </section>
      )}
    </main>
  )
}

export default FavoritesPage
