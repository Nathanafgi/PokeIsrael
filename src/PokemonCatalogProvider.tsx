import { useEffect, useState, type ReactNode } from 'react'
import {
  fetchPokemonCatalog,
  type PokemonCatalogItem,
} from './services/pokeApi'
import {
  PokemonCatalogContext,
  type PokemonCatalogState,
} from './PokemonCatalogContext'

export function PokemonCatalogProvider({
  children,
}: {
  children: ReactNode
}) {
  const [state, setState] = useState<PokemonCatalogState>({
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadCatalog() {
      try {
        const pokemon: PokemonCatalogItem[] = await fetchPokemonCatalog(
          controller.signal,
        )
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
              : 'אירעה שגיאה לא צפויה בעת טעינת רשימת הפוקימונים.',
        })
      }
    }

    void loadCatalog()
    return () => controller.abort()
  }, [])

  return (
    <PokemonCatalogContext.Provider value={state}>
      {children}
    </PokemonCatalogContext.Provider>
  )
}
