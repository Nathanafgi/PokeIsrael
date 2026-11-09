import { Link } from 'react-router-dom'
import './NotFoundPage.css'

function NotFoundPage() {
  return (
    <main className="app-shell not-found-page" dir="rtl">
      <section className="not-found-panel" aria-labelledby="not-found-title">
        <p className="not-found-code" aria-hidden="true">
          404
        </p>
        <p className="eyebrow">הגעתם לאזור לא מוכר</p>
        <h1 id="not-found-title">העמוד הזה לא נמצא</h1>
        <p className="not-found-description">
          נראה שהכתובת שגויה או שהעמוד הועבר. אפשר לחזור לפוקימונים ולהמשיך
          לגלות.
        </p>
        <div className="not-found-actions">
          <Link className="not-found-primary-action" to="/">
            חזרה לעמוד הראשי
          </Link>
          <Link className="not-found-secondary-action" to="/favorites">
            מעבר למועדפים
          </Link>
        </div>
      </section>
    </main>
  )
}

export default NotFoundPage
