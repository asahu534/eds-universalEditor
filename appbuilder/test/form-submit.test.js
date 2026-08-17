/*
 * Tests for the form-submit action (actions/form-submit/index.js).
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
const action = require('./../actions/form-submit/index.js')

const validParams = {
  email: 'a@b.com',
  message: 'hello',
  name: 'Alice',
  CRM_API_TOKEN: 'demo-token-123'
}

beforeEach(() => {
  Core.Logger.mockClear()
  mockLoggerInstance.info.mockReset()
  mockLoggerInstance.debug.mockReset()
  mockLoggerInstance.error.mockReset()
  fetch.mockReset()
})

describe('form-submit', () => {
  test('main should be defined', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('should respond 204 to CORS preflight without body or headers', async () => {
    const response = await action.main({ __ow_method: 'options' })
    expect(response.statusCode).toBe(204)
    expect(response.headers).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should return 400 when required parameters are missing', async () => {
    const response = await action.main({})
    expect(response.error.statusCode).toBe(400)
    expect(response.error.body.error).toContain('email')
    expect(response.error.body.error).toContain('message')
    expect(response.error.body.error).toContain('CRM_API_TOKEN')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should return 400 for an invalid email', async () => {
    const response = await action.main({ ...validParams, email: 'not-an-email' })
    expect(response).toEqual({
      error: { statusCode: 400, body: { error: "invalid parameter 'email'" } }
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should POST to the CRM with a Bearer token from CRM_API_TOKEN', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })

    const response = await action.main(validParams)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('https://httpbin.org/post')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer demo-token-123')
    const body = JSON.parse(opts.body)
    expect(body).toEqual({
      email: 'a@b.com',
      name: 'Alice',
      message: 'hello',
      source: 'eds-contact-form'
    })
  })

  test('should not leak the CRM response body to the client', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ headers: { Authorization: 'Bearer demo-token-123' } })
    })

    const response = await action.main(validParams)

    expect(response.body).toEqual({ ok: true })
    expect(JSON.stringify(response)).not.toContain('demo-token-123')
  })

  test('should return 500 when CRM fetch rejects', async () => {
    const fakeError = new Error('network')
    fetch.mockRejectedValue(fakeError)

    const response = await action.main(validParams)

    expect(response).toEqual({
      error: { statusCode: 500, body: { error: 'server error' } }
    })
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(fakeError)
  })

  test('should return 500 when CRM responds non-2xx', async () => {
    fetch.mockResolvedValue({ ok: false, status: 502 })

    const response = await action.main(validParams)

    expect(response).toEqual({
      error: { statusCode: 500, body: { error: 'server error' } }
    })
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('502') })
    )
  })
})
