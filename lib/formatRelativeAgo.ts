export function formatRelativeAgo(pastMs: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - pastMs)
  const sec = Math.floor(diff / 1000)
  if (sec < 45) return 'just now'

  const min = Math.floor(sec / 60)
  if (min < 60) {
    return min === 1 ? '1 minute ago' : `${min} minutes ago`
  }

  const hr = Math.floor(min / 60)
  if (hr < 24) {
    return hr === 1 ? '1 hour ago' : `${hr} hours ago`
  }

  const day = Math.floor(hr / 24)
  if (day < 14) {
    return day === 1 ? '1 day ago' : `${day} days ago`
  }

  const week = Math.floor(day / 7)
  return week === 1 ? '1 week ago' : `${week} weeks ago`
}
