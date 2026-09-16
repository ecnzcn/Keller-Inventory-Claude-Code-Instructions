import { useCallback, useEffect, useRef, useState } from 'react'
import { changeBus, type EntityKind } from '../../services/changeBus'

interface LiveQueryState<T> {
  data: T | undefined
  loading: boolean
  error: Error | undefined
  reload: () => void
}

/**
 * Runs `load()` on mount and again whenever one of `watch` entity kinds
 * changes elsewhere in the app (via changeBus), keeping screens in sync
 * without a global store.
 */
export function useLiveQuery<T>(load: () => Promise<T>, watch: EntityKind[]): LiveQueryState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const loadRef = useRef(load)
  loadRef.current = load

  const run = useCallback(() => {
    setLoading(true)
    loadRef
      .current()
      .then((result) => {
        setData(result)
        setError(undefined)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    run()
    const unsubscribers = watch.map((kind) =>
      changeBus.subscribe((changed) => {
        if (changed === kind) run()
      }),
    )
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [run, ...watch])

  return { data, loading, error, reload: run }
}
