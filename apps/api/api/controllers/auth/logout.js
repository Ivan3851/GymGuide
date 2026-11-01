module.exports = function logout(req, res) {
  if (!req.session) return res.json({ data: { loggedOut: true } })
  req.session.destroy((error) => {
    if (error)
      return res
        .status(500)
        .json({ error: { code: 'SESSION_ERROR', message: 'Could not end the admin session.' } })
    res.clearCookie('gymguide.sid', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.SESSION_COOKIE_SECURE === 'true',
    })
    return res.json({ data: { loggedOut: true } })
  })
}
