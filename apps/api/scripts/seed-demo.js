const path = require('node:path')
const Sails = require('sails').Sails
const demoSeed = require('../api/services/DemoSeedService')

const app = new Sails()
const appPath = path.resolve(__dirname, '..')

app.load({ appPath, log: { level: 'warn' } }, async (error) => {
  if (error) {
    console.error('Could not connect to the GymGuide demo database:', error.message)
    process.exitCode = 1
    return
  }

  try {
    const counts = await demoSeed.seed(app, process.env.GYMGUIDE_GYM_ID || 'demo-gym')
    console.log('GymGuide demo data seeded successfully:')
    console.log(JSON.stringify(counts, null, 2))
  } catch (seedError) {
    console.error('Demo seed failed:', seedError.message)
    process.exitCode = 1
  } finally {
    app.lower((lowerError) => {
      if (lowerError) {
        console.error('Could not cleanly close the seed session:', lowerError.message)
        process.exitCode = 1
      }
    })
  }
})
