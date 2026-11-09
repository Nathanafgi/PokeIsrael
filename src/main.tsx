import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FavoritesProvider } from './FavoritesProvider'
import { PokemonCatalogProvider } from './PokemonCatalogProvider'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FavoritesProvider>
      <PokemonCatalogProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PokemonCatalogProvider>
    </FavoritesProvider>
  </StrictMode>,
)
