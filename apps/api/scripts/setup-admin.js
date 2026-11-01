const path = require('node:path')
const readline = require('node:readline')
const bcrypt = require('bcryptjs')
const { Sails } = require('sails')
const AdminProvisioningService = require('../api/services/AdminProvisioningService')

function promptHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function')
      throw new Error(
        'Password prompt requires a terminal. Set ADMIN_PASSWORD in the environment for non-interactive setup.',
      )
    process.stdout.write(question)
    const onData = (character) => {
      const key = character.toString()
      if (key === '\n' || key === '\r' || key === '\u0004') {
        stdin.removeListener('data', onData)
        stdin.setRawMode(false)
        stdin.pause()
        process.stdout.write('\n')
        resolve(answer)
      } else if (key === '\u0003') {
        process.exit(130)
      } else if (key === '\u007f' || key === '\b') {
        answer = answer.slice(0, -1)
      } else {
        answer += key
      }
    }
    let answer = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('data', onData)
  })
}

async function promptVisible(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    }),
  )
}

async function main() {
  const username = (process.env.ADMIN_USERNAME || (await promptVisible('Admin username: ')))
    .trim()
    .toLowerCase()
  const email =
    (
      process.env.ADMIN_EMAIL ||
      (await promptVisible('Admin email (optional, press Enter to skip): '))
    )
      .trim()
      .toLowerCase() || null
  const password = process.env.ADMIN_PASSWORD || (await promptHidden('Admin password (hidden): '))
  AdminProvisioningService.validateUsername(username)
  AdminProvisioningService.validateEmail(email)
  if (password.length < 12 || password.length > 128 || Buffer.byteLength(password, 'utf8') > 72)
    throw new Error('Password must be 12–128 characters and no more than 72 UTF-8 bytes.')

  const app = new Sails()
  await new Promise((resolve, reject) =>
    app.load({ appPath: path.resolve(__dirname, '..'), log: { level: 'warn' } }, (error) =>
      error ? reject(error) : resolve(),
    ),
  )
  try {
    const db = app.hooks.orm.datastores.default.manager.client.db()
    const gymId = process.env.GYMGUIDE_GYM_ID || 'demo-gym'
    if (!(await db.collection('gyms').findOne({ _id: gymId, status: 'active' })))
      throw new Error(`Active gym "${gymId}" not found. Run npm run seed:demo first.`)
    const passwordHash = await bcrypt.hash(password, 12)
    const result = await AdminProvisioningService.provision(db, {
      username,
      email,
      passwordHash,
      gymId,
      resetExisting: process.argv.includes('--reset-existing'),
    })
    console.log(`Admin account ${result.action} for username "${username}".`)
  } finally {
    await new Promise((resolve) => app.lower(() => resolve()))
  }
}

main().catch((error) => {
  console.error(`Admin setup failed: ${error.message}`)
  process.exitCode = 1
})
