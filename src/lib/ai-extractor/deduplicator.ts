import Fuse from 'fuse.js'
import { DetectedService } from './types'

/**
 * Deduplicates services using fuzzy name matching.
 * Services with 70%+ similarity are considered duplicates.
 * Keeps the version with highest confidence score.
 */
export function deduplicateServices(services: DetectedService[]): DetectedService[] {
  if (services.length === 0) return []

  // Configure fuzzy matching
  const fuse = new Fuse(services, {
    keys: ['name'],
    threshold: 0.3,  // 0.3 = 70% similarity required for match
    includeScore: true
  })

  const unique: DetectedService[] = []
  const processedIndices = new Set<number>()

  services.forEach((service, idx) => {
    // Skip if already processed as part of another duplicate group
    if (processedIndices.has(idx)) return

    // Find all similar services
    const matches = fuse.search(service.name)
    const duplicateIndices = matches
      .map(m => m.refIndex)
      .filter(i => i !== idx && !processedIndices.has(i))

    if (duplicateIndices.length > 0) {
      // Found duplicates - merge them
      const allVersions = [service, ...duplicateIndices.map(i => services[i])]

      // Keep the version with highest confidence
      const bestVersion = allVersions.reduce((prev, curr) =>
        curr.confidence > prev.confidence ? curr : prev
      )

      // If price/duration is missing in best version, try to get from other versions
      const mergedService: DetectedService = {
        ...bestVersion,
        price: bestVersion.price ?? allVersions.find(v => v.price)?.price ?? null,
        durationMinutes: bestVersion.durationMinutes ?? allVersions.find(v => v.durationMinutes)?.durationMinutes ?? null,
      }

      unique.push(mergedService)

      // Mark all duplicates as processed
      duplicateIndices.forEach(i => processedIndices.add(i))
    } else {
      // No duplicates found, keep as-is
      unique.push(service)
    }

    processedIndices.add(idx)
  })

  console.log(`Deduplication: ${services.length} services → ${unique.length} unique (removed ${services.length - unique.length} duplicates)`)

  return unique
}

/**
 * Groups duplicate services without merging (for UI display)
 */
export function groupDuplicateServices(services: DetectedService[]): Array<{
  primary: DetectedService
  duplicates: DetectedService[]
}> {
  if (services.length === 0) return []

  const fuse = new Fuse(services, {
    keys: ['name'],
    threshold: 0.3,
    includeScore: true
  })

  const groups: Array<{ primary: DetectedService; duplicates: DetectedService[] }> = []
  const processedIndices = new Set<number>()

  services.forEach((service, idx) => {
    if (processedIndices.has(idx)) return

    const matches = fuse.search(service.name)
    const duplicateIndices = matches
      .map(m => m.refIndex)
      .filter(i => i !== idx && !processedIndices.has(i))

    if (duplicateIndices.length > 0) {
      const allVersions = [service, ...duplicateIndices.map(i => services[i])]
      const primary = allVersions.reduce((prev, curr) =>
        curr.confidence > prev.confidence ? curr : prev
      )
      const duplicates = allVersions.filter(v => v !== primary)

      groups.push({ primary, duplicates })
      duplicateIndices.forEach(i => processedIndices.add(i))
    }

    processedIndices.add(idx)
  })

  return groups
}
