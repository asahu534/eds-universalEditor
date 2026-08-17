/*
 * team-proxy action
 *
 * Public GET endpoint that proxies a demo person feed (randomuser.me) and returns a
 * shape that the Adobe JSON2HTML worker renders into a /partners page via a Mustache template.
 *
 * Deployed as `appbuilder/team-proxy` (see app.config.yaml).
 */

const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters } = require('../utils')

const UPSTREAM = 'https://randomuser.me/api/'
const DEFAULT_RESULTS = 12
const MAX_RESULTS = 50
const CACHE_SECONDS = 300

function parseResults (raw) {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_RESULTS
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RESULTS
  return Math.min(n, MAX_RESULTS)
}

// Server-side initials so the logic-less Mustache template needs no computation.
function initials (name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('')
}

function shapePerson (p) {
  const name = `${p.name?.first || ''} ${p.name?.last || ''}`.trim()
  const picture = p.picture?.large || p.picture?.medium || ''
  return {
    name,
    title: [p.location?.city, p.location?.country].filter(Boolean).join(', '),
    email: p.email || '',
    picture,
    hasPhoto: Boolean(picture),
    initials: initials(name),
    alt: name ? `Photo of ${name}` : ''
  }
}

async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('team-proxy invoked')
    logger.debug(stringParameters(params))

    // Adobe I/O Runtime auto-injects CORS headers on web actions; we return no body/headers here.
    if (params.__ow_method === 'options') {
      return { statusCode: 204 }
    }

    const results = parseResults(params.results)
    const url = `${UPSTREAM}?results=${results}&inc=name,email,picture,location&nat=us,gb,fr,de,es`

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`request to ${UPSTREAM} failed with status code ${res.status}`)
    }
    const upstream = await res.json()
    const people = Array.isArray(upstream.results) ? upstream.results.map(shapePerson) : []

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`
      },
      body: {
        count: people.length,
        results: people
      }
    }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
