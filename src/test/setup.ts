import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer'

// jsdom's own Blob/File aren't structured-cloned correctly by
// fake-indexeddb (arrayBuffer() goes missing on read-back), even though
// real browsers handle this fine (verified separately in a real browser).
// Node's Blob/File round-trip correctly, so tests use those instead.
globalThis.Blob = NodeBlob as unknown as typeof Blob
globalThis.File = NodeFile as unknown as typeof File
