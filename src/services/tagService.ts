import { tagRepository } from '../repository/tagRepository'
import type { Tag } from '../types/entities'

export const tagService = {
  listTags: (): Promise<Tag[]> => tagRepository.list(),

  /** Finds existing tags by name (case-insensitive) or creates new ones, returning their ids. */
  resolveTagIds: async (names: string[]): Promise<string[]> => {
    const trimmed = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
    const existing = await tagRepository.list()
    const byLowerName = new Map(existing.map((tag) => [tag.name.toLowerCase(), tag]))

    const ids: string[] = []
    for (const name of trimmed) {
      const found = byLowerName.get(name.toLowerCase())
      if (found) {
        ids.push(found.id)
        continue
      }
      const tag: Tag = { id: crypto.randomUUID(), name }
      await tagRepository.save(tag)
      byLowerName.set(name.toLowerCase(), tag)
      ids.push(tag.id)
    }
    return ids
  },

  deleteTag: async (id: string): Promise<void> => {
    await tagRepository.remove(id)
  },
}
