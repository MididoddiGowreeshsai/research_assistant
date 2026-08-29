import { useCallback, useRef, useState } from 'react'
import type { AgentStep, NodeName, Phase, SSEPayload } from '../types'

const PIPELINE: { node: NodeName; label: string }[] = [
  { node: 'rag', label: 'RAG Retrieval' },
  { node: 'orchestrator', label: 'Orchestrator' },
  { node: 'search', label: 'Web Search' },
  { node: 'summarizer', label: 'Summarizer' },
  { node: 'writer', label: 'Writer' },
  { node: 'store_report', label: 'Save to Memory' },
]

function initSteps(): AgentStep[] {
  return PIPELINE.map(({ node, label }) => ({ node, label, status: 'pending' }))
}

export function useResearchStream() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState<AgentStep[]>(initSteps())
  const [report, setReport] = useState('')
  const [threadId, setThreadId] = useState('')
  const [subQuestions, setSubQuestions] = useState<string[]>([])
  const [ragHits, setRagHits] = useState(0)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const setStepStatus = (node: NodeName, status: AgentStep['status']) =>
    setSteps(prev => prev.map(s => s.node === node ? { ...s, status } : s))

  const dispatch = useCallback((event: string, payload: SSEPayload) => {
    switch (event) {
      case 'thread_id':
        if (payload.thread_id) setThreadId(payload.thread_id)
        break
      case 'node_start':
        if (payload.node) setStepStatus(payload.node, 'running')
        break
      case 'node_end':
        if (payload.node) {
          setStepStatus(payload.node, 'done')
          if (payload.node === 'orchestrator' && payload.sub_questions?.length) {
            setSubQuestions(payload.sub_questions)
          }
          if (payload.node === 'rag' && payload.rag_hits !== undefined) {
            setRagHits(payload.rag_hits)
          }
        }
        break
      case 'review_required':
        if (payload.thread_id) setThreadId(payload.thread_id)
        if (payload.report) setReport(payload.report)
        setPhase('review')
        break
      case 'complete':
        if (payload.report) setReport(payload.report)
        setPhase('complete')
        break
      case 'error':
        setError(payload.message ?? 'Unknown error')
        setPhase('error')
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const readStream = useCallback(async (res: Response) => {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const eventMatch = part.match(/^event: (.+)$/m)
        const dataMatch = part.match(/^data: (.+)$/m)
        if (eventMatch && dataMatch) {
          try {
            dispatch(eventMatch[1].trim(), JSON.parse(dataMatch[1].trim()))
          } catch { /* malformed JSON */ }
        }
      }
    }
  }, [dispatch])

  const startResearch = useCallback(async (topic: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setPhase('researching')
    setSteps(initSteps())
    setReport('')
    setSubQuestions([])
    setRagHits(0)
    setError('')

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
        signal: abortRef.current.signal,
      })
      await readStream(res)
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError('Connection failed. Is the API running on port 8000?')
        setPhase('error')
      }
    }
  }, [readStream])

  const submitFeedback = useCallback(async (approved: boolean, feedback = '') => {
    if (!threadId) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setPhase('researching')
    setSteps(initSteps())

    try {
      const res = await fetch(`/api/research/${threadId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, feedback }),
        signal: abortRef.current.signal,
      })
      await readStream(res)
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError('Connection failed.')
        setPhase('error')
      }
    }
  }, [threadId, readStream])

  return { phase, steps, report, threadId, subQuestions, ragHits, error, startResearch, submitFeedback }
}
