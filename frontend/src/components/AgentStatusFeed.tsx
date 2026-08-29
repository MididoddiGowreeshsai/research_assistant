import type { AgentStep } from '../types'

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
}

export function AgentStatusFeed({ steps, subQuestions }: AgentStatusFeedProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Pipeline</p>
        <div className="flex flex-col gap-2.5">
          {steps.map(step => (
            <div
              key={step.node}
              className={`flex items-center gap-3 text-sm ${
                step.status === 'pending'
                  ? 'text-slate-600'
                  : step.status === 'running'
                  ? 'text-slate-200'
                  : 'text-slate-400'
              }`}
            >
              <span className="flex items-center justify-center w-5 h-5 shrink-0">
                <StatusIcon status={step.status} />
              </span>
              {step.label}
              {step.status === 'running' && (
                <span className="text-[10px] text-indigo-400 animate-pulse ml-auto">running</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {subQuestions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Sub-questions</p>
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
