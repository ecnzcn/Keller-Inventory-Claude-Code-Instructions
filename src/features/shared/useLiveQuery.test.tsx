import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { changeBus } from '../../services/changeBus'
import { useLiveQuery } from './useLiveQuery'

function Probe({ param, onLoad }: { param: string; onLoad: () => void }) {
  const { data, loading } = useLiveQuery(
    () => {
      onLoad()
      return Promise.resolve(param)
    },
    ['item'],
    [param],
  )
  if (loading) return <p>loading</p>
  return <p>value: {data}</p>
}

describe('useLiveQuery', () => {
  it('reloads when a reactive dep changes, not just on mount', async () => {
    let loadCount = 0
    const { rerender } = render(<Probe param="a" onLoad={() => (loadCount += 1)} />)
    await waitFor(() => screen.getByText('value: a'))
    expect(loadCount).toBe(1)

    // Regression test: navigating between two route params (e.g. two
    // different locations/items) must trigger a reload, not keep showing
    // the first param's stale data forever.
    rerender(<Probe param="b" onLoad={() => (loadCount += 1)} />)
    await waitFor(() => screen.getByText('value: b'))
    expect(loadCount).toBe(2)
  })

  it('reloads when a watched entity kind changes via changeBus', async () => {
    let loadCount = 0
    render(<Probe param="a" onLoad={() => (loadCount += 1)} />)
    await waitFor(() => screen.getByText('value: a'))
    expect(loadCount).toBe(1)

    changeBus.emit('item')
    await waitFor(() => expect(loadCount).toBe(2))
  })

  it('does not reload for an unwatched entity kind', async () => {
    let loadCount = 0
    render(<Probe param="a" onLoad={() => (loadCount += 1)} />)
    await waitFor(() => screen.getByText('value: a'))

    changeBus.emit('location')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(loadCount).toBe(1)
  })
})
