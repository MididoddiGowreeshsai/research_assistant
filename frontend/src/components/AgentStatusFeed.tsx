import type { AgentStep } from '../types'

const NODE_META: Record<string, { icon: string; desc: string }> = {
  rag:          { icon: '🧠', desc: 'Searching past approved reports for reusable knowledge' },
  orchestrator: { icon: '🗂️', desc: 'Planning targeted sub-questions to fill knowledge gaps' },
  search:       { icon: '🌐', desc: 'Running live web searches via Tavily' },
  summarizer:   { icon: '✂️', desc: 'Distilling search results into concise summaries' },
  writer:       { icon: '✍️', desc: 'Composing the final structured report' },
  store_report: { icon: '💾', desc: 'Saving approved report for future retrieval' },
}

function StatusIcon({ status }: { status: AgentStep['status'] }) {
  if (status === 'done')
    return <span className="text-emerald-400 text-sm leading-none">✓</span>
  if (status === 'running')
    return (
      <svg className="w-3.5 h-3.5 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    )
  return <span className="w-3.5 h-3.5 rounded-full border border-slate-700 inline-block" />
}

interface AgentStatusFeedProps {
  steps: AgentStep[]
  subQuestions: string[]
  ragHits: number
}

export function AgentStatusFeed({ steps, subQuestions, ragHits }: AgentStatusFeedProps) {
  const done = steps.filter(s => s.status === 'done').length
  const total = steps.length

  return (
    <div className="flex flex-col gap-5">
      {/* Progress header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Pipeline</p>
          <span className="text-[10px] text-slate-600 tabular-nums">{done}/{total}</span>
        </div>
        <div className="h-1 w-full rounded-full bg-slate-800 mb-3">
          <div
            className="h-1 rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          {steps.map(step => {
            const meta = NODE_META[step.node]
            const isRunning = step.status === 'running'
            const isDone = step.status === 'done'
            const showRagBadge = step.node === 'rag' && isDone

            return (
              <div key={step.node} className="flex flex-col gap-0.5">
                <div
                  className={`flex items-center gap-3 text-sm ${
                    step.status === 'pending'
                      ? 'text-slate-600'
                      : isRunning
                      ? 'text-slate-100'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="flex items-center justify-center w-5 h-5 shrink-0">
                    <StatusIcon status={step.status} />
                  </span>
                  <span className="flex items-center gap-1.5">
                    {meta?.icon && <span className="text-xs">{meta.icon}</span>}
                    {step.label}
                  </span>
                  {isRunning && (
                    <span className="text-[10px] text-indigo-400 animate-pulse ml-auto">working…</span>
                  )}
                  {showRagBadge && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      ragHits > 0
                        ? 'bg-indigo-900/60 text-indigo-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {ragHits > 0 ? `${ragHits} hit${ragHits > 1 ? 's' : ''}` : 'no hits'}
                    </span>
                  )}
                </div>
                {(isRunning) && meta?.desc && (
                  <p className="text-[10px] text-slate-600 ml-8 leading-relaxed">{meta.desc}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sub-questions */}
      {subQuestions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Research questions</p>
          <ol className="flex flex-col gap-2">
            {subQuestions.map((q, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-500">
                <span className="text-indigo-500 font-medium shrink-0 leading-relaxed">{i + 1}.</span>
                <span className="leading-relaxed">{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
