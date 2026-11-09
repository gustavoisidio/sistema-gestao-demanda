const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  upload: 'M12 16V4m0 0L8 8m4-4l4 4M4 20h16',
  'chart-search': 'M4 20V4M4 20h16M8 16l3-4 3 2 4-6',
  'trending-up': 'M3 17l6-6 4 4 8-8M15 7h6v6',
  leaderboard: 'M5 20v-8M12 20V4M19 20v-5',
  tune: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4',
  monitor: 'M3 5h18v11H3zM8 21h8M12 16v5',
  'file-text': 'M6 3h9l4 4v14H6zM9 12h7M9 16h7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  swap: 'M7 7h13l-4-4M17 17H4l4 4',
  download: 'M12 4v12m0 0l-4-4m4 4l4-4M4 20h16',
  check: 'M5 13l4 4L19 7',
  error: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v5M12 16h.01',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 8h.01',
  table: 'M3 5h18v14H3zM3 10h18M9 5v14',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3',
  box: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',
  compare: 'M8 3v18M16 3v18M4 8h8M12 16h8',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  sparkles: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z',
  handshake: 'M3 12l4-4 4 2 3-2 4 4-5 5-3-1-2 2-5-3z',
  school: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  touch: 'M9 11V5a2 2 0 014 0v6l4 1v5l-3 4H9l-4-6 2-1z',
  'chevron-down': 'M6 9l6 6 6-6',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5',
  funnel: 'M4 5h16l-6 8v6l-4-2v-4z',
} as const

export type IconName = keyof typeof PATHS

interface Props {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 18, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
