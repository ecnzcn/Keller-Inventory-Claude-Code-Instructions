export type EntityKind = 'item' | 'location' | 'category' | 'tag' | 'photo' | 'document'

type Listener = (kind: EntityKind) => void

const listeners = new Set<Listener>()

/**
 * Minimal pub/sub so one screen's mutation (e.g. deleting a location in
 * Settings) can invalidate another screen's cached list (e.g. the
 * Locations screen) without a global state library.
 */
export const changeBus = {
  emit(kind: EntityKind): void {
    for (const listener of listeners) listener(kind)
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
