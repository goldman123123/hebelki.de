import type { TemplateId } from '@/lib/db/schema'

export interface TemplateConfig {
  id: TemplateId
  name: string
  description: string
  previewColors: string[]
  darkMode: boolean
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'dark-luxury',
    name: 'Dark Luxury',
    description: 'Elegantes Design mit schwarzem Hintergrund, Gold-Akzenten und schimmernden Effekten.',
    previewColors: ['#000000', '#d4af37', '#1a1a1a', '#fafafa'],
    darkMode: true,
  },
  {
    id: 'brutalism',
    name: 'Brutalism',
    description: 'Kühnes Design mit dicken Rahmen, Offset-Schatten und monospacer Typografie.',
    previewColors: ['#f5f5f0', '#000000', '#d4af37', '#ff6600'],
    darkMode: false,
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Mattglas-Karten mit Blur-Effekten, Smaragd- und Cyan-Farbtönen.',
    previewColors: ['#0a0a0a', '#27ae60', '#3498db', '#ffffff'],
    darkMode: true,
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-Farben, Glitch-Effekte und ein futuristisches Raster-Design.',
    previewColors: ['#0a0012', '#00fff2', '#ff00ff', '#d4af37'],
    darkMode: true,
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazin-Stil mit großen Überschriften, Initialen und elegantem Layout.',
    previewColors: ['#1a1a1a', '#d4af37', '#ffffff', '#0a0a0a'],
    darkMode: true,
  },
  {
    id: 'neo-minimal',
    name: 'Neo-Minimal',
    description: 'Ultra-sauberes Design mit weißem Hintergrund und feiner Typografie.',
    previewColors: ['#ffffff', '#000000', '#fafafa', '#888888'],
    darkMode: false,
  },
]

export function getTemplateConfig(id: TemplateId): TemplateConfig {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0]
}
