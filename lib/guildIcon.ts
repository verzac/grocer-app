import type { UserGuild } from '@/lib/api/types'

const GUILD_AVATAR_BG_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#059669',
  '#ca8a04',
  '#0891b2',
  '#4f46e5',
  '#be123c',
  '#65a30d',
] as const

export function guildAvatarBackgroundColor(orderIndex: number): string {
  return GUILD_AVATAR_BG_COLORS[orderIndex % GUILD_AVATAR_BG_COLORS.length]!
}

export function resolveGuildIconUrl(guild: UserGuild): string | null {
  const { id, icon } = guild
  if (!icon) return null
  if (icon.startsWith('http://') || icon.startsWith('https://')) return icon
  const ext = icon.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/icons/${id}/${icon}.${ext}?size=128`
}

export function guildInitial(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const ch = Array.from(t)[0]
  return ch ? ch.toUpperCase() : '?'
}
