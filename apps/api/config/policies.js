// Admin endpoints use explicit route middleware in routes.js; catalog routes stay public.
module.exports.policies = {
  '*': true,
}
