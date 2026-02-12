import type { TemplateId, TemplateProps } from './types'
import { DarkLuxuryTemplate } from './DarkLuxuryTemplate'
import { BrutalismTemplate } from './BrutalismTemplate'
import { GlassmorphismTemplate } from './GlassmorphismTemplate'
import { CyberpunkTemplate } from './CyberpunkTemplate'
import { EditorialTemplate } from './EditorialTemplate'
import { NeoMinimalTemplate } from './NeoMinimalTemplate'

export type { TemplateProps, TemplateId }

const TEMPLATE_REGISTRY: Record<TemplateId, React.ComponentType<TemplateProps>> = {
  'dark-luxury': DarkLuxuryTemplate,
  'brutalism': BrutalismTemplate,
  'glassmorphism': GlassmorphismTemplate,
  'cyberpunk': CyberpunkTemplate,
  'editorial': EditorialTemplate,
  'neo-minimal': NeoMinimalTemplate,
}

export function getTemplateComponent(id: TemplateId): React.ComponentType<TemplateProps> {
  return TEMPLATE_REGISTRY[id] || DarkLuxuryTemplate
}
