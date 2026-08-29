import { useState } from 'react'
import { AgentStatusFeed } from './components/AgentStatusFeed'
import { HitlReviewBar } from './components/HitlReviewBar'
import { ReportPreview } from './components/ReportPreview'
import { useResearchStream } from './hooks/useResearchStream'

export default function App() {
  const [topic, setTopic] = useState('')
  const { phase, steps, report, subQuestions, error, startResearch, submitFeedback } =
    useResearchStream()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (topic.trim()) startResearch(topic.trim())
  }

  const hasReport = report.length > 0
  const isResearching = phase === 'researching'

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-800/60 px-6 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold select-none">
          R
        </div>
        <span className="text-sm font-semibold tracking-tight">Research Assistant</span>
        <span className="ml-auto text-xs text-slate-600">LangGraph · Gemini Pro · Tavily</span>
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
              disabled={isResearching}
              className="resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-shadow"
            />
            <button
              type="submit"
              disabled={!topic.trim() || isResearching}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              {isResearching ? 'Researching…' : 'Research →'}
            </button>
          </form>

          {phase !== 'idle' && (
            <AgentStatusFeed steps={steps} subQuestions={subQuestions} />
          )}

          {phase === 'error' && (
            <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs text-red-400">
              {error}
            </div>
          )}
        </aside>

        {/* Right Panel */}
        <main className="flex flex-1 flex-col overflow-y-auto p-8">
          {phase === 'idle' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl select-none">🔬</span>
              <p className="text-sm text-slate-600">
                Enter a topic to generate a structured research report.
              </p>
            </div>
          )}

          {isResearching && !hasReport && (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
              Agents are working…
            </div>
          )}

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
