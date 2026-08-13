import { describe, expect, it } from 'vitest'
import { ApiError } from './api'

describe('ApiError', () => {
  it('carries status code and message', () => {
    const err = new ApiError(404, 'player_not_found')
    expect(err.status).toBe(404)
    expect(err.message).toBe('player_not_found')
    expect(err.name).toBe('ApiError')
    expect(err).toBeInstanceOf(Error)
  })
})
