const ApiError = require('./ApiError')

const schemas = {
  'muscle-groups': {
    name: { type: 'text', maxLength: 100 },
    description: { type: 'text', maxLength: 500 },
  },
  'equipment-types': {
    name: { type: 'text', maxLength: 120 },
    description: { type: 'text', maxLength: 500 },
  },
  'gym-equipment': {
    displayName: { type: 'text', maxLength: 160 },
  },
  'floor-plans': {
    name: { type: 'text', maxLength: 120 },
  },
  exercises: {
    name: { type: 'text', maxLength: 160 },
    summary: { type: 'text', maxLength: 700, optional: true },
    instructions: { type: 'list' },
    benefits: { type: 'list', optional: true },
    tips: { type: 'list', optional: true },
    commonMistakes: { type: 'list', optional: true },
  },
  variations: {
    name: { type: 'text', maxLength: 160 },
    description: { type: 'text', maxLength: 500 },
    instructions: { type: 'list' },
  },
}

function isEmpty(value, type) {
  return type === 'list'
    ? !Array.isArray(value) || value.length === 0
    : typeof value !== 'string' || !value.trim()
}

function validateValue(value, field, schema) {
  if (schema.type === 'list') {
    if (
      !Array.isArray(value) ||
      value.length > 50 ||
      value.some((entry) => typeof entry !== 'string' || !entry.trim() || entry.length > 1000)
    ) {
      throw ApiError.badRequest(`${field} must be a list of up to 50 text entries.`)
    }
    return
  }
  if (typeof value !== 'string' || value.length > schema.maxLength) {
    throw ApiError.badRequest(
      `${field} must be text no longer than ${schema.maxLength} characters.`,
    )
  }
}

function normalizeForStorage(resource, incoming, legacyData, existing = null) {
  const schema = schemas[resource]
  if (!schema || incoming === undefined) return null
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming))
    throw ApiError.badRequest('translations must contain Macedonian and English objects.')
  for (const key of Object.keys(incoming)) {
    if (!['mk-MK', 'en'].includes(key))
      throw ApiError.badRequest('Only Macedonian (mk-MK) and English (en) content are supported.')
    if (!incoming[key] || typeof incoming[key] !== 'object' || Array.isArray(incoming[key]))
      throw ApiError.badRequest(`translations.${key} must be an object.`)
    for (const field of Object.keys(incoming[key])) {
      if (!Object.hasOwn(schema, field))
        throw ApiError.badRequest(`The ${field} field cannot be translated for this resource.`)
    }
  }

  const translations = { 'mk-MK': {}, en: {} }
  const canonical = {}
  for (const [field, fieldSchema] of Object.entries(schema)) {
    const values = {}
    for (const language of ['mk-MK', 'en']) {
      const fromInput = incoming[language]?.[field]
      const fromExisting = existing?.translations?.[language]?.[field]
      const value =
        fromInput !== undefined
          ? fromInput
          : fromExisting !== undefined
            ? fromExisting
            : legacyData[field] !== undefined
              ? legacyData[field]
              : existing?.[field]
      if (value !== undefined) validateValue(value, `${language}.${field}`, fieldSchema)
      values[language] =
        fieldSchema.optional &&
        fieldSchema.type === 'text' &&
        typeof value === 'string' &&
        !value.trim()
          ? ''
          : value
    }
    if (
      !fieldSchema.optional &&
      isEmpty(values['mk-MK'], fieldSchema.type) &&
      isEmpty(values.en, fieldSchema.type)
    )
      throw ApiError.badRequest(`${field} must be entered in at least one language.`)

    const emptyValue = fieldSchema.type === 'list' ? [] : ''
    translations['mk-MK'][field] = values['mk-MK'] ?? emptyValue
    translations.en[field] = values.en ?? emptyValue
    canonical[field] = isEmpty(values['mk-MK'], fieldSchema.type)
      ? (values.en ?? emptyValue)
      : values['mk-MK']
  }
  return { translations, canonical }
}

function contentForLocale(record, resource, locale) {
  if (!record) return record
  const schema = schemas[resource]
  if (!schema) return record
  const selected = locale === 'mk-MK' ? 'mk-MK' : 'en'
  const fallback = selected === 'mk-MK' ? 'en' : 'mk-MK'
  const translations = record.translations || {}
  const result = {}
  for (const [field, fieldSchema] of Object.entries(schema)) {
    const selectedValue = translations[selected]?.[field]
    const fallbackValue = translations[fallback]?.[field]
    const candidate = isEmpty(selectedValue, fieldSchema.type)
      ? isEmpty(fallbackValue, fieldSchema.type)
        ? undefined
        : fallbackValue
      : selectedValue
    result[field] = candidate ?? record[field]
  }
  return { ...record, ...result }
}

module.exports = { schemas, normalizeForStorage, contentForLocale }
