/*
 * Tests for the team-proxy action (actions/generic/index.js).
 */

jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn()
  }
}))

const { Core } = require('@adobe/aio-sdk')
const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)

jest.mock('node-fetch')
const fetch = require('node-fetch')
const action = require('./../actions/generic/index.js')

beforeEach(() => {
  Core.Logger.mockClear()
  mockLoggerInstance.info.mockReset()
  mockLoggerInstance.debug.mockReset()
  mockLoggerInstance.error.mockReset()
  fetch.mockReset()
})

const upstreamPayload = {
  results: [
    {
      name: { first: 'Ada', last: 'Lovelace' },
      email: 'ada@example.com',
      picture: { large: 'https://img/large.jpg', medium: 'https://img/medium.jpg' },
      location: { city: 'London', country: 'UK' }
    }
  ]
}

describe('team-proxy', () => {
  test('main should be defined', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('should set logger to use LOG_LEVEL param', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(upstreamPayload) })
    await action.main({ LOG_LEVEL: 'fakeLevel' })
    expect(Core.Logger).toHaveBeenCalledWith(expect.any(String), { level: 'fakeLevel' })
  })

  test('should return shaped results with cache header (no manual CORS)', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(upstreamPayload) })

    const response = await action.main({})

    expect(response.statusCode).toBe(200)
    expect(response.headers['Cache-Control']).toMatch(/max-age=\d+/)
    expect(response.headers['Content-Type']).toBe('application/json')
    expect(response.headers).not.toHaveProperty('Access-Control-Allow-Origin')
    expect(response.body).toEqual({
      count: 1,
      results: [{
        name: 'Ada Lovelace',
        title: 'London, UK',
        email: 'ada@example.com',
        picture: 'https://img/large.jpg'
      }]
    })
  })

  test('should default to 12 results when parameter is omitted', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) })
    await action.main({})
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('results=12'))
  })

  test('should cap results parameter at 50', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) })
    await action.main({ results: '9999' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('results=50'))
  })

  test('should reject non-numeric results and fall back to default', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) })
    await action.main({ results: 'not-a-number' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('results=12'))
  })

  test('should respond 204 to CORS preflight without body or headers', async () => {
    const response = await action.main({ __ow_method: 'options' })
    expect(response.statusCode).toBe(204)
    expect(response.headers).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should return 500 when upstream fetch rejects', async () => {
    const fakeError = new Error('network down')
    fetch.mockRejectedValue(fakeError)

    const response = await action.main({})

    expect(response).toEqual({
      error: {
        statusCode: 500,
        body: { error: 'server error' }
      }
    })
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(fakeError)
  })

  test('should return 500 when upstream responds with non-2xx', async () => {
    fetch.mockResolvedValue({ ok: false, status: 503 })

    const response = await action.main({})

    expect(response).toEqual({
      error: {
        statusCode: 500,
        body: { error: 'server error' }
      }
    })
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('503') })
    )
  })
})
