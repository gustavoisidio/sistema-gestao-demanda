import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './ToastContext'

interface Toast {
  id: number
  message: string
}

const DURATION_MS = 3000

/** SPEC-SHL-07: avisos temporários, empilháveis, com role="status". */
export function ToastProvider({ children, duration = DURATION_MS }: { children: ReactNode; duration?: number }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const show = useCallback(
    (message: string) => {
      const id = nextId.current++
      setToasts((t) => [...t, { id, message }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration)
    },
    [duration],
  )

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" data-testid="toasts">
        {toasts.map((t) => (
          <div key={t.id} role="status" className="pointer-events-auto max-w-md rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
