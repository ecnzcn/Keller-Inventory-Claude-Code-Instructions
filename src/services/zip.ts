/**
 * Minimal ZIP reader/writer (STORE method only, no compression).
 *
 * Hand-written instead of pulling in a library: the app only ever needs to
 * write and read its own backups, so the full ZIP spec (compression
 * methods, split archives, comments, Unicode flags, ...) is unnecessary
 * complexity. This covers exactly what docs/DATA_MODEL.md's backup format
 * needs and nothing more.
 */

const LOCAL_FILE_SIGNATURE = 0x04034b50
const CENTRAL_DIR_SIGNATURE = 0x02014b50
const END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50
const STORE_METHOD = 0

let crcTable: Uint32Array | undefined

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  crcTable = table
  return table
}

function crc32(bytes: Uint8Array): number {
  const table = getCrcTable()
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: dosDate }
}

export interface ZipEntryInput {
  path: string
  data: Blob
}

export interface ZipEntryOutput {
  path: string
  data: Blob
}

export async function createZipBlob(entries: ZipEntryInput[]): Promise<Blob> {
  const encoder = new TextEncoder()
  const { time, date } = dosDateTime(new Date())
  const parts: BlobPart[] = []
  const centralDirParts: BlobPart[] = []
  let offset = 0
  let centralDirSize = 0

  for (const entry of entries) {
    const buffer = new Uint8Array(await entry.data.arrayBuffer())
    const nameBytes = encoder.encode(entry.path)
    const crc = crc32(buffer)
    const size = buffer.length

    const localHeader = new DataView(new ArrayBuffer(30))
    localHeader.setUint32(0, LOCAL_FILE_SIGNATURE, true)
    localHeader.setUint16(4, 20, true) // version needed
    localHeader.setUint16(6, 0, true) // flags
    localHeader.setUint16(8, STORE_METHOD, true)
    localHeader.setUint16(10, time, true)
    localHeader.setUint16(12, date, true)
    localHeader.setUint32(14, crc, true)
    localHeader.setUint32(18, size, true) // compressed size
    localHeader.setUint32(22, size, true) // uncompressed size
    localHeader.setUint16(26, nameBytes.length, true)
    localHeader.setUint16(28, 0, true) // extra field length

    parts.push(localHeader.buffer, nameBytes, buffer)

    const centralHeader = new DataView(new ArrayBuffer(46))
    centralHeader.setUint32(0, CENTRAL_DIR_SIGNATURE, true)
    centralHeader.setUint16(4, 20, true) // version made by
    centralHeader.setUint16(6, 20, true) // version needed
    centralHeader.setUint16(8, 0, true) // flags
    centralHeader.setUint16(10, STORE_METHOD, true)
    centralHeader.setUint16(12, time, true)
    centralHeader.setUint16(14, date, true)
    centralHeader.setUint32(16, crc, true)
    centralHeader.setUint32(20, size, true)
    centralHeader.setUint32(24, size, true)
    centralHeader.setUint16(28, nameBytes.length, true)
    centralHeader.setUint16(30, 0, true) // extra length
    centralHeader.setUint16(32, 0, true) // comment length
    centralHeader.setUint16(34, 0, true) // disk number start
    centralHeader.setUint16(36, 0, true) // internal attributes
    centralHeader.setUint32(38, 0, true) // external attributes
    centralHeader.setUint32(42, offset, true) // local header offset

    centralDirParts.push(centralHeader.buffer, nameBytes)
    centralDirSize += 46 + nameBytes.length
    offset += 30 + nameBytes.length + size
  }

  const centralDirOffset = offset
  const eocd = new DataView(new ArrayBuffer(22))
  eocd.setUint32(0, END_OF_CENTRAL_DIR_SIGNATURE, true)
  eocd.setUint16(4, 0, true) // disk number
  eocd.setUint16(6, 0, true) // disk with central dir
  eocd.setUint16(8, entries.length, true) // entries on this disk
  eocd.setUint16(10, entries.length, true) // total entries
  eocd.setUint32(12, centralDirSize, true)
  eocd.setUint32(16, centralDirOffset, true)
  eocd.setUint16(20, 0, true) // comment length

  return new Blob([...parts, ...centralDirParts, eocd.buffer], { type: 'application/zip' })
}

export class ZipReadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipReadError'
  }
}

export async function readZipEntries(blob: Blob): Promise<ZipEntryOutput[]> {
  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  if (buffer.byteLength < 22) {
    throw new ZipReadError('Datei ist zu klein, um ein gültiges ZIP-Archiv zu sein.')
  }

  let eocdOffset = -1
  const searchStart = Math.max(0, buffer.byteLength - 22 - 0xffff)
  for (let i = buffer.byteLength - 22; i >= searchStart; i--) {
    if (view.getUint32(i, true) === END_OF_CENTRAL_DIR_SIGNATURE) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) {
    throw new ZipReadError('Kein gültiges ZIP-Archiv gefunden (End-of-Central-Directory fehlt).')
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const centralDirOffset = view.getUint32(eocdOffset + 16, true)

  const decoder = new TextDecoder()
  const results: ZipEntryOutput[] = []
  let cursor = centralDirOffset

  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(cursor, true) !== CENTRAL_DIR_SIGNATURE) {
      throw new ZipReadError('Beschädigtes ZIP-Archiv (ungültiger Central-Directory-Eintrag).')
    }
    const method = view.getUint16(cursor + 10, true)
    const crc = view.getUint32(cursor + 16, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const uncompressedSize = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength)
    const path = decoder.decode(nameBytes)

    if (method !== STORE_METHOD) {
      throw new ZipReadError(
        `"${path}" ist komprimiert gespeichert. Nur unkomprimierte Keller-Sicherungen werden unterstützt.`,
      )
    }

    const localNameLength = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true)
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
    const dataEnd = dataStart + compressedSize
    const data = bytes.slice(dataStart, dataEnd)

    if (data.length !== uncompressedSize || crc32(data) !== crc) {
      throw new ZipReadError(`"${path}" ist beschädigt (Prüfsumme stimmt nicht überein).`)
    }

    results.push({ path, data: new Blob([data]) })
    cursor += 46 + nameLength + extraLength + commentLength
  }

  return results
}
