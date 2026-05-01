import { useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

import type { UserGuild } from '@/lib/api/types'
import {
  guildAvatarBackgroundColor,
  guildInitial,
  resolveGuildIconUrl,
} from '@/lib/guildIcon'

type Props = {
  guild: UserGuild
  /** 0-based position in the GET /guilds list (drives fallback colour). */
  orderIndex: number
  size?: number
}

export function GuildAvatar({ guild, orderIndex, size = 40 }: Props) {
  const url = resolveGuildIconUrl(guild)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [url])

  const showImage = Boolean(url && !imageFailed)
  const bg = guildAvatarBackgroundColor(orderIndex)
  const initial = guildInitial(guild.name)
  const radius = size / 2

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: showImage ? '#1e293b' : bg,
        },
      ]}
    >
      {showImage && url ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: url }}
          style={{ width: size, height: size, borderRadius: radius }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text
          style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}
          maxFontSizeMultiplier={1.4}
        >
          {initial}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: {
    color: '#f8fafc',
    fontWeight: '700',
  },
})
