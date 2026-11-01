const net = require('node:net')
const http = require('node:http')
const { spawn } = require('node:child_process')
const path = require('node:path')

const mongoUri = process.env.MONGODB_URI
const readinessRetryMs = Number(process.env.MONGODB_READINESS_RETRY_MS || 2000)

function mongoAddress(uri) {
  if (!uri) throw new Error('MONGODB_URI must be configured before production startup.')
  const parsed = new URL(uri)
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol))
    throw new Error('MONGODB_URI must use mongodb:// or mongodb+srv://.')
  if (parsed.protocol === 'mongodb+srv:')
    throw new Error('A local Windows kiosk requires a mongodb:// TCP connection.')
  const host = (parsed.hostname || '127.0.0.1').replace(/^\[|\]$/g, '')
  if (!['127.0.0.1', '::1', 'localhost'].includes(host))
    throw new Error('Production MONGODB_URI must point to a local MongoDB address.')
  return { host, port: Number(parsed.port || 27017) }
}

function waitForMongo({ host, port }) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    socket.setTimeout(2000)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

function createStartupPage(host, port) {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    })
    response.end(
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="4"><title>GymGuide starting</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111714;color:#f3f5ef;font:20px system-ui;text-align:center}.card{max-width:36rem;padding:3rem}h1{font-size:2.4rem}p{color:#aab4a7}.spinner{width:32px;height:32px;margin:1.5rem auto;border:4px solid #435044;border-top-color:#a4d175;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style><main class="card"><h1>GymGuide is starting</h1><div class="spinner" aria-hidden="true"></div><p>Waiting for the local database. This page will retry automatically.</p><p>You can leave this screen open.</p></main></html>`,
    )
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.removeListener('error', reject)
      resolve(server)
    })
  })
}

async function main() {
  const address = mongoAddress(mongoUri)
  if (!Number.isInteger(readinessRetryMs) || readinessRetryMs < 250 || readinessRetryMs > 60_000)
    throw new Error('MONGODB_READINESS_RETRY_MS must be between 250 and 60000 milliseconds.')
  process.env.NODE_ENV = 'production'
  const host = process.env.HOST || '127.0.0.1'
  const port = Number(process.env.PORT || 1337)
  if (!['127.0.0.1', '::1', 'localhost'].includes(host))
    throw new Error('Production HOST must be a loopback address.')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT is invalid.')
  const sailsCli = path.join(__dirname, '..', 'node_modules', 'sails', 'bin', 'sails.js')
  while (true) {
    const startupPage = await createStartupPage(host, port)
    console.info(`GymGuide startup screen listening at http://${host}:${port}.`)
    while (!(await waitForMongo(address))) {
      console.warn(`GymGuide waiting for local MongoDB at ${address.host}:${address.port}.`)
      await new Promise((resolve) => setTimeout(resolve, readinessRetryMs))
    }
    console.info('Local MongoDB accepts connections; starting GymGuide API.')
    await new Promise((resolve, reject) => {
      startupPage.close((error) => (error ? reject(error) : resolve()))
    })

    const api = spawn(process.execPath, [sailsCli, 'lift'], {
      cwd: path.resolve(__dirname, '..'),
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    })
    const exit = await new Promise((resolve, reject) => {
      api.once('error', reject)
      api.once('exit', (code, signal) => resolve({ code, signal }))
    })
    console.error(
      `Sails stopped (code ${exit.code ?? 'none'}${exit.signal ? `, signal ${exit.signal}` : ''}); restarting after 5 seconds.`,
    )
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}

main().catch((error) => {
  console.error(`GymGuide startup failed: ${error.message}`)
  process.exitCode = 1
})
