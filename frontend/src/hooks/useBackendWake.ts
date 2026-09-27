import { useEffect, useRef, useState } from 'react'
import { pingBackend } from '../lib/api'

export type WakeStatus = 'waking' | 'ready' | 'unreachable'

export function useBackendWake() {
  const [status, setStatus] = useState<WakeStatus>('waking')
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    startRef.current = Date.now()

    const tick = async () => {
      const secs = Math.floor((Date.now() - startRef.current) / 1000)
      setElapsed(secs)

      if (secs >= 90) {
        setStatus('unreachable')
        if (timerRef.current) clearInterval(timerRef.current)
        return
      }

      const alive = await pingBackend()
      if (cancelled) return

      if (alive) {
        setStatus('ready')
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }

    tick()
    timerRef.current = setInterval(tick, 3000)

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return { status, elapsed }
}
