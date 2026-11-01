module.exports.datastores = {
  default: {
    adapter: 'sails-mongo',
    url: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gymguide_dev',
  },
}
