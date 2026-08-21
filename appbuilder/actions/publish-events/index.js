/*
 * publish-notifier action
 *
 * Invoked by an Adobe I/O Events subscription for AEM publish events (or manually
 * via curl for smoke tests). Posts a message to a Slack Incoming Webhook when a
 * high-priority page is published.
 *
 * Deployed as `appbuilder/publish-notifier` (see app.config.yaml).
 *
 * I/O Events sends a CloudEvent JSON envelope; direct curl calls send a bare
 * payload. This action normalizes both shapes.
 */

const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')

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

function buildSlackMessage (event) {
  return {
    text: `:rocket: *${event.action}* — \`${event.path || '(no path)'}\` published by *${event.user}* (priority: ${event.priority || 'normal'})`
  }
}

async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('publish-notifier invoked')
    logger.debug(stringParameters(params))

    const errorMessage = checkMissingRequestInputs(params, ['SLACK_WEBHOOK_URL'], [])
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }

    const event = extractEvent(params)
    if (!event.path) {
      return errorResponse(400, 'missing parameter(s) \'path\'', logger)
    }

    // Only notify Slack for high-priority pages; still return 200 for other events
    // so the I/O Events subscription does not retry.
    if (event.priority !== 'high') {
      logger.info(`skipping notification for priority='${event.priority}' path='${event.path}'`)
      return { statusCode: 200, body: { skipped: true, reason: 'priority-not-high' } }
    }

    const slackRes = await fetch(params.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSlackMessage(event))
    })

    if (!slackRes.ok) {
      throw new Error(`Slack webhook responded with status ${slackRes.status}`)
    }

    logger.info(`notified Slack for path='${event.path}'`)
    return { statusCode: 200, body: { notified: true, path: event.path } }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
