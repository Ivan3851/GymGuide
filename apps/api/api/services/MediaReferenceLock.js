let tail = Promise.resolve()

module.exports = {
  run: async function run(task) {
    let release
    const previous = tail
    tail = new Promise((resolve) => {
      release = resolve
    })
    await previous
    try {
      return await task()
    } finally {
      release()
    }
  },
}
