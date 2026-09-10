/*
 * publish-notifier action
 *
 * Invoked by an Adobe I/O Events subscription for AEM publish events (or manually
 * via curl for smoke tests). Posts a Microsoft Teams notification for published pages.
 *
 * Deployed as `appbuilder/publish-notifier` (see app.config.yaml).
 *
 * I/O Events sends a CloudEvent JSON envelope; direct curl calls send a bare
 * payload. This action normalizes both shapes.
 */

const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, isAuthorized } = require('../utils')

function extractEvent (params) {
  // I/O Events wraps the payload under `data`; direct calls put fields at the root.
  const data = params.data && typeof params.data === 'object' ? params.data : params
  return {
    path: data.path || data.contentPath || '',
    priority: (data.priority || '').toString().toLowerCase(),
    user: data.user || data.publishedBy || 'unknown',
    action: data.action || data.eventType || 'publish'
  }
}

// Absolute live URL for the page, when SITE_LIVE_HOST is configured.
function buildLiveUrl (event, siteLiveHost) {
  if (!siteLiveHost || !event.path) {
    return ''
  }
  const host = siteLiveHost.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const path = event.path.startsWith('/') ? event.path : `/${event.path}`
  return `https://${host}${path}`
}

const PAGE_EXTENSIONS = ['.md', '.html']

// `/faq.md` -> `/faq`; extensionless paths are left as-is.
function toWebPath (path) {
  const ext = PAGE_EXTENSIONS.find((e) => path.endsWith(e))
  return ext ? path.slice(0, -ext.length) : path
}

// Fetches the published page and reports whether its cq-tags meta contains requiredTag.
async function pageHasRequiredTag (path, siteLiveHost, requiredTag) {
  const host = siteLiveHost.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const webPath = toWebPath(path)
  const url = `https://${host}${webPath.startsWith('/') ? '' : '/'}${webPath}`
  const res = await fetch(url)
  if (!res.ok) {
    return false
  }
  const html = await res.text()
  const match = html.match(/<meta[^>]+name=["']cq-tags["'][^>]+content=["']([^"']*)["']/i)
  if (!match) {
    return false
  }
  return match[1].split(',').map((tag) => tag.trim()).includes(requiredTag)
}

// Teams "Workflows" webhooks expect an Adaptive Card wrapped in a message envelope.
function buildTeamsMessage (event, siteLiveHost) {
  const facts = [
    { title: 'Action', value: event.action || 'publish' },
    { title: 'Path', value: event.path || '(no path)' },
    { title: 'By', value: event.user || 'unknown' },
    { title: 'Priority', value: event.priority || 'normal' }
  ]

  const card = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: 'Page published' },
      { type: 'FactSet', facts }
    ]
  }

  const liveUrl = buildLiveUrl(event, siteLiveHost)
  if (liveUrl) {
    card.actions = [{ type: 'Action.OpenUrl', title: 'Open page', url: liveUrl }]
  }

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: card
      }
    ]
  }
}

async function postWebhook (url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    throw new Error(`webhook responded with status ${res.status}`)
  }
}

async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('publish-notifier invoked')
    logger.debug(stringParameters(params))

    // Shared-secret gate for the public webhook; only enforced when a secret is configured.
    if (params.SERVICE_API_KEY && !isAuthorized(params)) {
      return errorResponse(401, 'unauthorized', logger)
    }

    const teamsUrl = params.TEAMS_WEBHOOK_URL
    if (!teamsUrl) {
      return errorResponse(400, "missing parameter(s) 'TEAMS_WEBHOOK_URL'", logger)
    }

    const event = extractEvent(params)
    if (!event.path) {
      return errorResponse(400, 'missing parameter(s) \'path\'', logger)
    }

    // Optional filter: when REQUIRED_TAG is configured, only notify publish events whose
    // published page carries that cq-tags value (read from the live page). Unpublish
    // events are ignored.
    if (params.REQUIRED_TAG) {
      if (event.action.toLowerCase().includes('unpublish')) {
        return { statusCode: 200, body: { skipped: true, reason: 'unpublish-ignored' } }
      }
      let tagged = false
      if (params.SITE_LIVE_HOST) {
        try {
          tagged = await pageHasRequiredTag(event.path, params.SITE_LIVE_HOST, params.REQUIRED_TAG)
        } catch (error) {
          logger.error(`tag check failed for path='${event.path}': ${error.message}`)
        }
      }
      if (!tagged) {
        logger.info(`skipping path='${event.path}' (required tag not present)`)
        return { statusCode: 200, body: { skipped: true, reason: 'required-tag-not-present' } }
      }
    }

    try {
      await postWebhook(teamsUrl, buildTeamsMessage(event, params.SITE_LIVE_HOST))
    } catch (error) {
      logger.error(`teams notification failed: ${error.message}`)
      return errorResponse(500, 'server error', logger)
    }

    logger.info(`notified for path='${event.path}'`)
    return { statusCode: 200, body: { notified: true, path: event.path, teams: true } }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
