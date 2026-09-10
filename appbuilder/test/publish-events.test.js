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
const TEAMS_WEBHOOK_URL = 'https://example.powerplatform.com/workflows/abc/triggers/manual/paths/invoke'
const SERVICE_API_KEY = 'top-secret-token'

beforeEach(() => {
  Core.Logger.mockClear()
  mockLoggerInstance.info.mockReset()
  mockLoggerInstance.debug.mockReset()
  mockLoggerInstance.error.mockReset()
  fetch.mockReset()
})

function callFor (url) {
  return fetch.mock.calls.find((c) => c[0] === url)
}

describe('publish-notifier', () => {
  test('main should be defined', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('should return 400 when no webhook URL is configured', async () => {
    const response = await action.main({ path: '/foo', priority: 'high' })
    expect(response).toEqual({
      error: {
        statusCode: 400,
        body: { error: "missing parameter(s) 'SLACK_WEBHOOK_URL' or 'TEAMS_WEBHOOK_URL'" }
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

  test('should notify on non-high priority (no priority filter)', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      SLACK_WEBHOOK_URL,
      TEAMS_WEBHOOK_URL,
      path: '/campaigns/foo',
      priority: 'low'
    })

    expect(response).toEqual({
      statusCode: 200,
      body: { notified: true, path: '/campaigns/foo', slack: true, teams: true }
    })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('should POST to Slack webhook for a direct payload', async () => {
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
      body: { notified: true, path: '/campaigns/launch', slack: true }
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = callFor(SLACK_WEBHOOK_URL)
    expect(url).toBe(SLACK_WEBHOOK_URL)
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(opts.body)
    expect(body.text).toContain('/campaigns/launch')
    expect(body.text).toContain('alice')
  })

  test('should POST an Adaptive Card to Teams webhook', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      SITE_LIVE_HOST: 'main--repo--owner.aem.live',
      path: '/pages/hero',
      priority: 'high',
      user: 'bob'
    })

    expect(response).toEqual({
      statusCode: 200,
      body: { notified: true, path: '/pages/hero', teams: true }
    })
    const [, opts] = callFor(TEAMS_WEBHOOK_URL)
    const body = JSON.parse(opts.body)
    expect(body.type).toBe('message')
    expect(body.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive')
    const card = body.attachments[0].content
    const factValues = card.body.find((b) => b.type === 'FactSet').facts.map((f) => f.value)
    expect(factValues).toContain('/pages/hero')
    expect(factValues).toContain('bob')
    expect(card.actions[0].url).toBe('https://main--repo--owner.aem.live/pages/hero')
  })

  test('should omit the Open page action when SITE_LIVE_HOST is absent', async () => {
    fetch.mockResolvedValue({ ok: true })

    await action.main({ TEAMS_WEBHOOK_URL, path: '/pages/hero', priority: 'high' })

    const [, opts] = callFor(TEAMS_WEBHOOK_URL)
    const card = JSON.parse(opts.body).attachments[0].content
    expect(card.actions).toBeUndefined()
  })

  test('should post to both Slack and Teams when both are configured', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      SLACK_WEBHOOK_URL,
      TEAMS_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response.body).toEqual({ notified: true, path: '/x', slack: true, teams: true })
    expect(callFor(SLACK_WEBHOOK_URL)).toBeDefined()
    expect(callFor(TEAMS_WEBHOOK_URL)).toBeDefined()
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
    const body = JSON.parse(callFor(SLACK_WEBHOOK_URL)[1].body)
    expect(body.text).toContain('/pages/hero')
    expect(body.text).toContain('bob')
  })

  test('should return 200 with partial success when one webhook fails', async () => {
    fetch.mockImplementation((url) => (url === SLACK_WEBHOOK_URL
      ? Promise.resolve({ ok: false, status: 500 })
      : Promise.resolve({ ok: true })))

    const response = await action.main({
      SLACK_WEBHOOK_URL,
      TEAMS_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response).toEqual({
      statusCode: 200,
      body: { notified: true, path: '/x', slack: false, teams: true }
    })
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(
      expect.stringContaining('slack notification failed')
    )
  })

  test('should return 500 when all webhooks fail', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 })

    const response = await action.main({
      SLACK_WEBHOOK_URL,
      TEAMS_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response).toEqual({
      error: { statusCode: 500, body: { error: 'server error' } }
    })
  })

  test('should return 500 when the only webhook fetch rejects', async () => {
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
  })

  test('should return 401 when SERVICE_API_KEY is set but the x-api-key header is missing', async () => {
    const response = await action.main({
      SERVICE_API_KEY,
      TEAMS_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response).toEqual({
      error: { statusCode: 401, body: { error: 'unauthorized' } }
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should return 401 when the x-api-key header is wrong', async () => {
    const response = await action.main({
      SERVICE_API_KEY,
      __ow_headers: { 'x-api-key': 'nope' },
      TEAMS_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response.error.statusCode).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should reject a token query param (auth is header-only)', async () => {
    const response = await action.main({
      SERVICE_API_KEY,
      token: SERVICE_API_KEY,
      TEAMS_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response.error.statusCode).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should notify when the correct x-api-key header is provided', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      SERVICE_API_KEY,
      __ow_headers: { 'x-api-key': SERVICE_API_KEY },
      TEAMS_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.teams).toBe(true)
  })
})
