function parentOf(group) {
  return typeof group?.parentId === 'string' && group.parentId ? group.parentId : null
}

function descendantsOf(groups, groupId) {
  const children = new Map()
  for (const group of groups) {
    const parentId = parentOf(group)
    if (!parentId) continue
    const entries = children.get(parentId) || []
    entries.push(String(group.id ?? group._id))
    children.set(parentId, entries)
  }
  const result = new Set([String(groupId)])
  const queue = [String(groupId)]
  while (queue.length) {
    for (const childId of children.get(queue.shift()) || []) {
      if (result.has(childId)) continue
      result.add(childId)
      queue.push(childId)
    }
  }
  return result
}

function rootIdFor(groupsById, groupId) {
  let current = groupsById.get(String(groupId))
  if (!current) return null
  const visited = new Set()
  while (parentOf(current)) {
    const id = String(current.id ?? current._id)
    if (visited.has(id)) return null
    visited.add(id)
    current = groupsById.get(parentOf(current))
    if (!current) return null
  }
  return String(current.id ?? current._id)
}

module.exports = { parentOf, descendantsOf, rootIdFor }
