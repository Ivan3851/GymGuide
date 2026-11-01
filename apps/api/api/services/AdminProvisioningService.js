function validateUsername(username) {
  if (!/^[a-z0-9._-]{3,80}$/.test(username || '')) {
    throw new Error(
      'Username must be 3-80 lowercase letters, numbers, dots, underscores or hyphens.',
    )
  }
}

function validateEmail(email) {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address or leave it blank.')
  }
}

async function provision(db, { username, email, passwordHash, gymId, resetExisting = false }) {
  validateUsername(username)
  validateEmail(email)
  if (!passwordHash) throw new Error('A password hash is required.')

  const admins = db.collection('adminUsers')
  const existing = await admins.findOne({ username })
  if (existing) {
    if (!resetExisting) {
      throw new Error(
        `Admin account "${username}" already exists. Refusing to replace it; pass --reset-existing to explicitly change its password.`,
      )
    }
    const updated = await admins.updateOne(
      { _id: existing._id },
      {
        $set: {
          passwordHash,
          ...(email ? { email } : {}),
          updatedAt: Date.now(),
        },
        ...(email ? {} : { $unset: { email: '' } }),
      },
    )
    if (updated.matchedCount !== 1)
      throw new Error('The existing admin account changed during reset.')
    return { action: 'reset', id: String(existing._id) }
  }

  const id = `admin-${username}`
  await admins.insertOne({
    _id: id,
    username,
    ...(email ? { email } : {}),
    passwordHash,
    role: 'gym-admin',
    gymId,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  return { action: 'created', id }
}

module.exports = { provision, validateUsername, validateEmail }
