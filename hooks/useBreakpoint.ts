import { useWindowDimensions } from 'react-native'

export const TABLET_MIN_WIDTH = 768

export function useBreakpoint() {
  const { width, height } = useWindowDimensions()
  const isLandscape = width > height
  const isTablet = Math.min(width, height) >= TABLET_MIN_WIDTH
  const isTabletLandscape = isTablet && isLandscape

  return {
    width,
    height,
    isLandscape,
    isTablet,
    isTabletLandscape,
  }
}
