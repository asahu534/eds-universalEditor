/*
 * Tests for the publish-notifier action (actions/publish-events/index.js).
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
const action = require('./../actions/publish-events/index.js')

const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T000/B000/xxx'

beforeEach(() => {
  Core.Logger.mockClear()
  mockLoggerInstance.info.mockReset()
  mockLoggerInstance.debug.mockReset()
  mockLoggerInstance.error.mockReset()
  fetch.mockReset()
})

describe('publish-notifier', () => {
  test('main should be defined', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('should return 400 when SLACK_WEBHOOK_URL is missing', async () => {
    const response = await action.main({ path: '/foo', priority: 'high' })
    expect(response).toEqual({
      error: {
        statusCode: 400,
        body: { error: "missing parameter(s) 'SLACK_WEBHOOK_URL'" }
      }
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should return 400 when path is missing', async () => {
    const response = await action.main({ SLACK_WEBHOOK_URL, priority: 'high' })
    expect(response).toEqual({
      error: {
        statusCode: 400,
        body: { error: "missing parameter(s) 'path'" }
      }
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should skip Slack call when priority is not high', async () => {
    const response = await action.main({
      SLACK_WEBHOOK_URL,
      path: '/campaigns/foo',
      priority: 'low'
    })
    expect(response).toEqual({
      statusCode: 200,
      body: { skipped: true, reason: 'priority-not-high' }
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should POST to Slack webhook for high-priority direct payload', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      SLACK_WEBHOOK_URL,
      path: '/campaigns/launch',
      priority: 'HIGH',
      user: 'alice',
      action: 'publish'
    })

    expect(response).toEqual({
      statusCode: 200,
      body: { notified: true, path: '/campaigns/launch' }
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe(SLACK_WEBHOOK_URL)
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(opts.body)
    expect(body.text).toContain('/campaigns/launch')
    expect(body.text).toContain('alice')
  })

  test('should unwrap CloudEvent `data` envelope', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      SLACK_WEBHOOK_URL,
      data: {
        path: '/pages/hero',
        priority: 'high',
        user: 'bob'
      }
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.notified).toBe(true)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.text).toContain('/pages/hero')
    expect(body.text).toContain('bob')
  })

  test('should return 500 when Slack webhook responds non-2xx', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 })

    const response = await action.main({
      SLACK_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response).toEqual({
      error: { statusCode: 500, body: { error: 'server error' } }
    })
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('500') })
    )
  })

  test('should return 500 when Slack fetch rejects', async () => {
    const fakeError = new Error('boom')
    fetch.mockRejectedValue(fakeError)

    const response = await action.main({
      SLACK_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response).toEqual({
      error: { statusCode: 500, body: { error: 'server error' } }
    })
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(fakeError)
  })
})
