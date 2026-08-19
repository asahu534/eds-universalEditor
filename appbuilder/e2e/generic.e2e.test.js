/* 
* <license header>
*/

const { Config } = require('@adobe/aio-sdk').Core
const fs = require('fs')
const fetch = require('node-fetch')

// get action url
const namespace = Config.get('runtime.namespace')
const hostname = Config.get('cna.hostname') || 'adobeioruntime.net'
const packagejson = JSON.parse(fs.readFileSync('package.json').toString())
const runtimePackage = 'appbuilder'
const actionUrl = `https://${namespace}.${hostname}/api/v1/web/${runtimePackage}/team-proxy`

// The team-proxy action is gated by a shared `x-api-key` secret (see actions/generic/index.js).
// Without the header the action returns 401 before proxying the upstream feed.
test('returns a 401 when missing x-api-key header', async () => {
  const res = await fetch(actionUrl)
  expect(res).toEqual(expect.objectContaining({
    status: 401
  }))
})
