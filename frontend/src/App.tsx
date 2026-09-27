import { useState } from 'react'
import { AgentStatusFeed } from './components/AgentStatusFeed'
import { HitlReviewBar } from './components/HitlReviewBar'
import { ReportPreview } from './components/ReportPreview'
import { useBackendWake } from './hooks/useBackendWake'
import { useResearchStream } from './hooks/useResearchStream'

const ACTIVE_NODE_CONTEXT: Record<string, { headline: string; detail: string }> = {
  rag:          { headline: 'Searching memory…', detail: 'Looking for similar past reports in pgvector to avoid repeating work.' },
  orchestrator: { headline: 'Planning research…', detail: 'Breaking the topic into targeted sub-questions that cover any knowledge gaps.' },
  search:       { headline: 'Searching the web…', detail: 'Running live Tavily searches for each sub-question.' },
  summarizer:   { headline: 'Reading results…', detail: 'Distilling each set of search results into a concise summary (runs in parallel).' },
  writer:       { headline: 'Writing report…', detail: 'Composing a structured report from summaries and any prior knowledge.' },
  store_report: { headline: 'Saving to memory…', detail: 'Embedding the approved report into pgvector for future retrieval.' },
}

const FEATURES = [
  { icon: '🧠', title: 'RAG memory', desc: 'Retrieves relevant past reports so agents only fill genuine knowledge gaps.' },
  { icon: '🌐', title: 'Live web search', desc: 'Searches the web in real time via Tavily for up-to-date information.' },
  { icon: '👁️', title: 'Human review', desc: 'You approve or request changes before the report is finalised.' },
  { icon: '💾', title: 'Auto-persist', desc: 'Approved reports are embedded and stored for future research sessions.' },
]

export default function App() {
  const [topic, setTopic] = useState('')
  const { phase, steps, report, subQuestions, ragHits, error, startResearch, submitFeedback } =
    useResearchStream()
  const { status: wakeStatus, elapsed } = useBackendWake()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (topic.trim()) startResearch(topic.trim())
  }

  const hasReport = report.length > 0
  const isResearching = phase === 'researching'
  const isWaking = wakeStatus === 'waking'

  const activeStep = steps.find(s => s.status === 'running')
  const activeCtx = activeStep ? ACTIVE_NODE_CONTEXT[activeStep.node] : null

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Cold-start banner */}
      {isWaking && (
        <div className="shrink-0 flex items-center gap-2 border-b border-amber-900/50 bg-amber-950/50 px-6 py-2 text-xs text-amber-300">
          <span className="animate-pulse">●</span>
          Backend waking up on Render — cold starts take ~30 s.
          <span className="ml-auto tabular-nums text-amber-500">{elapsed}s</span>
        </div>
      )}
      {wakeStatus === 'unreachable' && (
        <div className="shrink-0 border-b border-red-900/50 bg-red-950/50 px-6 py-2 text-xs text-red-400">
          Backend unreachable after 90 s. Check that the Render service is running.
        </div>
      )}

      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-800/60 px-6 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold select-none">
          R
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight">Research Assistant</span>
          <span className="ml-2 text-[10px] text-slate-600">LangGraph · Gemini · Tavily · pgvector</span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left Panel */}
        <aside className="flex w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-800/60 p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Research Topic
            </label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. The impact of AI on software engineering jobs"
              rows={4}
              disabled={isResearching || isWaking}
              className="resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-shadow"
            />
            <button
              type="submit"
              disabled={!topic.trim() || isResearching || isWaking}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              {isWaking ? 'Waiting for backend…' : isResearching ? 'Researching…' : 'Research →'}
            </button>
          </form>

          {phase !== 'idle' && (
            <AgentStatusFeed steps={steps} subQuestions={subQuestions} ragHits={ragHits} />
          )}

          {phase === 'error' && (
            <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs text-red-400">
              {error}
            </div>
          )}
        </aside>

        {/* Right Panel */}
        <main className="flex flex-1 flex-col overflow-y-auto p-8">
          {/* Idle state */}
          {phase === 'idle' && !isWaking && (
            <div className="flex flex-1 flex-col items-center justify-center gap-8 max-w-xl mx-auto w-full">
              <div className="text-center">
                <div className="text-4xl mb-3 select-none">🔬</div>
                <h1 className="text-lg font-semibold text-slate-100 mb-1">Multi-Agent Research Assistant</h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Enter a topic and a 6-agent pipeline will search the web, synthesise findings,
                  and generate a structured report — blending past knowledge with live results.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                {FEATURES.map(f => (
                  <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="text-xl mb-1.5">{f.icon}</div>
                    <p className="text-xs font-semibold text-slate-300 mb-1">{f.title}</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waking spinner */}
          {isWaking && phase === 'idle' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
              <p className="text-sm text-slate-500">Connecting to backend…</p>
              <p className="text-xs text-slate-700">{elapsed}s elapsed — Render free tier cold starts can take up to 60 s</p>
            </div>
          )}

          {/* Active node context (no report yet) */}
          {isResearching && !hasReport && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
              {activeCtx ? (
                <div>
                  <p className="text-sm font-medium text-slate-200">{activeCtx.headline}</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">{activeCtx.detail}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Agents are working…</p>
              )}
            </div>
          )}

          {/* Report */}
          {hasReport && (
            <>
              {phase === 'review' && (
                <HitlReviewBar onSubmit={submitFeedback} />
              )}
              <ReportPreview report={report} isComplete={phase === 'complete'} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
