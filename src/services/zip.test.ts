import { describe, expect, it } from 'vitest'
import { createZipBlob, readZipEntries, ZipReadError } from './zip'

describe('zip', () => {
  it('round-trips a single text entry', async () => {
    const zip = await createZipBlob([{ path: 'data.json', data: new Blob(['{"a":1}'], { type: 'application/json' }) }])
    const entries = await readZipEntries(zip)

    expect(entries).toHaveLength(1)
    expect(entries[0].path).toBe('data.json')
    expect(await entries[0].data.text()).toBe('{"a":1}')
  })

  it('round-trips multiple entries including binary data', async () => {
    const binary = new Uint8Array([0, 1, 2, 255, 254, 253, 10, 20, 30])
    const zip = await createZipBlob([
      { path: 'data.json', data: new Blob(['{}'], { type: 'application/json' }) },
      { path: 'photos/a-b.jpg', data: new Blob([binary], { type: 'image/jpeg' }) },
      { path: 'documents/c-d.pdf', data: new Blob(['%PDF-fake'], { type: 'application/pdf' }) },
    ])

    const entries = await readZipEntries(zip)
    expect(entries.map((e) => e.path)).toEqual(['data.json', 'photos/a-b.jpg', 'documents/c-d.pdf'])

    const photoBytes = new Uint8Array(await entries[1].data.arrayBuffer())
    expect(Array.from(photoBytes)).toEqual(Array.from(binary))
  })

  it('handles an empty file entry', async () => {
    const zip = await createZipBlob([{ path: 'empty.txt', data: new Blob([]) }])
    const entries = await readZipEntries(zip)
    expect(entries[0].data.size).toBe(0)
  })

  it('rejects a non-ZIP file', async () => {
    const notZip = new Blob(['just some plain text, not a zip archive'])
    await expect(readZipEntries(notZip)).rejects.toThrow(ZipReadError)
  })

  it('rejects a truncated/corrupted ZIP file', async () => {
    const zip = await createZipBlob([{ path: 'data.json', data: new Blob(['{"a":1}']) }])
    const truncated = new Blob([(await zip.arrayBuffer()).slice(0, 10)])
    await expect(readZipEntries(truncated)).rejects.toThrow(ZipReadError)
  })
})
