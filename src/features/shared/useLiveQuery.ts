import { useCallback, useEffect, useRef, useState } from 'react'
import { changeBus, type EntityKind } from '../../services/changeBus'

interface LiveQueryState<T> {
  data: T | undefined
  loading: boolean
  error: Error | undefined
  reload: () => void
}

/**
 * Runs `load()` on mount, whenever one of `watch` entity kinds changes
 * elsewhere in the app (via changeBus), and whenever a value in `deps`
 * changes (e.g. a route param like `itemId` — without this, navigating
 * from one item/location to another would keep showing the previous
 * screen's stale data until an unrelated mutation happened to fire).
 */
export function useLiveQuery<T>(
  load: () => Promise<T>,
  watch: EntityKind[],
  deps: unknown[] = [],
): LiveQueryState<T> {
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
    // `run` is stable; `watch` is meant to be a literal array of entity
    // kinds at the call site, and `deps` carries the caller's reactive
    // values (e.g. route params) that should force a reload.
  }, [run, ...watch, ...deps])

  return { data, loading, error, reload: run }
}
