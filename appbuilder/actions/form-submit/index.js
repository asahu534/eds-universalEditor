/*
 * form-submit action
 *
 * Public POST endpoint invoked by the EDS contact-form block. Forwards the
 * submission to a downstream CRM (httpbin.org for the demo) with a Bearer
 * token pulled from the App Builder environment — the browser never sees the
 * token.
 *
 * Deployed as `appbuilder/form-submit` (see app.config.yaml).
 */

const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')

const CRM_ENDPOINT = 'https://httpbin.org/post'
const MAX_FIELD_LENGTH = 2000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clip (value) {
  if (typeof value !== 'string') return ''
  return value.slice(0, MAX_FIELD_LENGTH)
}

async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('form-submit invoked')
    logger.debug(stringParameters(params))

    // Adobe I/O Runtime auto-injects CORS headers on web actions; we return no body/headers here.
    if (params.__ow_method === 'options') {
      return { statusCode: 204 }
    }

    const errorMessage = checkMissingRequestInputs(
      params,
      ['email', 'message', 'CRM_API_TOKEN'],
      []
    )
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }

    const email = clip(params.email).trim()
    if (!EMAIL_RE.test(email)) {
      return errorResponse(400, "invalid parameter 'email'", logger)
    }

    const payload = {
      email,
      name: clip(params.name),
      message: clip(params.message),
      source: 'eds-contact-form'
    }

    const res = await fetch(CRM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.CRM_API_TOKEN}`
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      throw new Error(`request to ${CRM_ENDPOINT} failed with status code ${res.status}`)
    }

    // Do not echo the CRM response body back to the browser — it may include
    // headers we do not want to leak.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { ok: true }
    }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
