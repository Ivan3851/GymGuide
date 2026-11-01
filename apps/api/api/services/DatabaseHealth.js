module.exports = {
  ping: async function ping(sailsInstance) {
    const datastore = sailsInstance.hooks.orm.datastores.default
    return datastore.manager.client.db().command({ ping: 1 })
  },
}
