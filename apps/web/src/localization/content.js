export function localizeRecord(record, locale, _kind = 'catalog') {
  if (!record) return record
  const selectedLanguage = locale === 'mk-MK' ? 'mk-MK' : 'en'
  const fallbackLanguage = selectedLanguage === 'mk-MK' ? 'en' : 'mk-MK'
  const selected = record.translations?.[selectedLanguage]
  const fallback = record.translations?.[fallbackLanguage]
  const localized = {}
  for (const field of [
    'name',
    'description',
    'summary',
    'instructions',
    'benefits',
    'tips',
    'commonMistakes',
    'displayName',
  ]) {
    const candidates = [selected?.[field], fallback?.[field], record[field]]
    const value = candidates.find((candidate) =>
      Array.isArray(candidate)
        ? candidate.length > 0
        : typeof candidate === 'string' && candidate.trim(),
    )
    if (value !== undefined) localized[field] = value
  }
  return { ...record, ...localized }
}

export function localizeRecords(records, locale, kind = 'catalog') {
  return Array.isArray(records)
    ? records.map((record) => localizeRecord(record, locale, kind))
    : records
}

export function localizeEquipmentUnit(unit, locale) {
  if (!unit) return unit
  const safeUnit = { ...unit }
  delete safeUnit.details
  delete safeUnit.description
  if (safeUnit.translations) {
    safeUnit.translations = Object.fromEntries(
      Object.entries(safeUnit.translations).map(([language, content]) => {
        const safeContent = { ...(content || {}) }
        delete safeContent.details
        delete safeContent.description
        return [language, safeContent]
      }),
    )
  }
  const localizedUnit = localizeRecord(safeUnit, locale, 'gymEquipment')
  const equipmentType = unit.equipmentType
    ? localizeRecord(unit.equipmentType, locale, 'equipment')
    : null
  return equipmentType
    ? {
        ...localizedUnit,
        displayName: localizedUnit.displayName || localizedUnit.name,
        equipmentType,
        equipmentTypeName: equipmentType.name,
      }
    : localizedUnit
}
