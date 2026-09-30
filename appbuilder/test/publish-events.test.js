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

const TEAMS_WEBHOOK_URL = 'https://example.powerplatform.com/workflows/abc/triggers/manual/paths/invoke'
const SERVICE_API_KEY = 'top-secret-token'
const TAG_HOST = 'main--eds-universaleditor--asahu534.aem.live'
const PRIORITY_TAG = 'universal-editor-site:priority/high'
const TAG_PAGE_URL = `https://${TAG_HOST}/faq`

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

// Mocks the page fetch (TAG_PAGE_URL) with `html` (null => not ok) and webhooks with 200.
function mockPage (html) {
  fetch.mockImplementation((url) => (url === TAG_PAGE_URL
    ? Promise.resolve({ ok: html !== null, text: () => Promise.resolve(html || '') })
    : Promise.resolve({ ok: true })))
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
        body: { error: "missing parameter(s) 'TEAMS_WEBHOOK_URL'" }
      }
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should return 400 when path is missing', async () => {
    const response = await action.main({ TEAMS_WEBHOOK_URL, priority: 'high' })
    expect(response).toEqual({
      error: {
        statusCode: 400,
        body: { error: "missing parameter(s) 'path'" }
      }
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should notify regardless of priority when no tag filter is set', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      path: '/campaigns/foo',
      priority: 'low'
    })

    expect(response).toEqual({
      statusCode: 200,
      body: { notified: true, path: '/campaigns/foo', teams: true }
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('should POST an Adaptive Card to Teams webhook', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      path: '/pages/hero',
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
    const facts = card.body.find((b) => b.type === 'FactSet').facts
    expect(facts.map((f) => f.title)).toEqual(['Action', 'Path', 'By'])
    expect(facts.map((f) => f.value)).toContain('/pages/hero')
    expect(facts.map((f) => f.value)).toContain('bob')
    expect(card.actions).toBeUndefined()
  })

  test('should not include a URL fact or link', async () => {
    fetch.mockResolvedValue({ ok: true })

    await action.main({ TEAMS_WEBHOOK_URL, SITE_LIVE_HOST: 'main--repo--owner.aem.live', path: '/pages/hero' })

    const [, opts] = callFor(TEAMS_WEBHOOK_URL)
    const card = JSON.parse(opts.body).attachments[0].content
    const factTitles = card.body.find((b) => b.type === 'FactSet').facts.map((f) => f.title)
    expect(card.actions).toBeUndefined()
    expect(factTitles).not.toContain('URL')
  })

  test('should unwrap CloudEvent `data` envelope', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      data: {
        path: '/pages/hero',
        priority: 'high',
        user: 'bob'
      }
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.notified).toBe(true)
    const card = JSON.parse(callFor(TEAMS_WEBHOOK_URL)[1].body).attachments[0].content
    const factValues = card.body.find((b) => b.type === 'FactSet').facts.map((f) => f.value)
    expect(factValues).toContain('/pages/hero')
    expect(factValues).toContain('bob')
  })

  test('should return 500 when the Teams webhook responds with an error', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 })

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      path: '/x',
      priority: 'high'
    })

    expect(response).toEqual({
      error: { statusCode: 500, body: { error: 'server error' } }
    })
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(
      expect.stringContaining('teams notification failed')
    )
  })

  test('should return 500 when the Teams webhook fetch rejects', async () => {
    fetch.mockRejectedValue(new Error('boom'))

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
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

  test('should notify when the required cq-tag is present on the page', async () => {
    mockPage('<meta name="cq-tags" content="universal-editor-site:priority/high">')

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      SITE_LIVE_HOST: TAG_HOST,
      REQUIRED_TAG: PRIORITY_TAG,
      path: '/faq.md',
      action: 'resource-published'
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.teams).toBe(true)
    expect(callFor(TEAMS_WEBHOOK_URL)).toBeDefined()
  })

  test('should skip when the required cq-tag is absent', async () => {
    mockPage('<meta name="cq-tags" content="universal-editor-site:category/news">')

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      SITE_LIVE_HOST: TAG_HOST,
      REQUIRED_TAG: PRIORITY_TAG,
      path: '/faq.md',
      action: 'resource-published'
    })

    expect(response).toEqual({ statusCode: 200, body: { skipped: true, reason: 'required-tag-not-present' } })
    expect(callFor(TEAMS_WEBHOOK_URL)).toBeUndefined()
  })

  test('should match the required tag within a comma-separated cq-tags list', async () => {
    mockPage('<meta name="cq-tags" content="universal-editor-site:category/news, universal-editor-site:priority/high">')

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      SITE_LIVE_HOST: TAG_HOST,
      REQUIRED_TAG: PRIORITY_TAG,
      path: '/faq.md',
      action: 'resource-published'
    })

    expect(response.body.teams).toBe(true)
  })

  test('should skip unpublish events when REQUIRED_TAG is set (no page fetch)', async () => {
    fetch.mockResolvedValue({ ok: true })

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      SITE_LIVE_HOST: TAG_HOST,
      REQUIRED_TAG: PRIORITY_TAG,
      path: '/faq.md',
      action: 'resource-unpublished'
    })

    expect(response).toEqual({ statusCode: 200, body: { skipped: true, reason: 'unpublish-ignored' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('should skip when the page fetch fails', async () => {
    mockPage(null)

    const response = await action.main({
      TEAMS_WEBHOOK_URL,
      SITE_LIVE_HOST: TAG_HOST,
      REQUIRED_TAG: PRIORITY_TAG,
      path: '/faq.md',
      action: 'resource-published'
    })

    expect(response.body.skipped).toBe(true)
    expect(callFor(TEAMS_WEBHOOK_URL)).toBeUndefined()
  })
})
