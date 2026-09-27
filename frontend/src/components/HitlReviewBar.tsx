import { useState } from 'react'

interface HitlReviewBarProps {
  onSubmit: (approved: boolean, feedback?: string) => void
}

export function HitlReviewBar({ onSubmit }: HitlReviewBarProps) {
  const [mode, setMode] = useState<'choose' | 'feedback'>('choose')
  const [feedback, setFeedback] = useState('')

  const handleRegenerate = () => {
    if (feedback.trim()) {
      onSubmit(false, feedback.trim())
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-700/40 bg-amber-950/30 p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="mt-0.5 w-2 h-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
        <div>
          <p className="text-sm font-medium text-amber-200">Report ready for your review</p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
            Approve to save it to memory and finalise, or request changes for the writer to revise.
          </p>
        </div>
      </div>

      {mode === 'choose' ? (
        <div className="flex gap-2 ml-5">
          <button
            onClick={() => onSubmit(true)}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            ✓ Approve & save
          </button>
          <button
            onClick={() => setMode('feedback')}
            className="rounded-lg bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          >
            ✎ Request changes
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 ml-5">
          <textarea
            autoFocus
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleRegenerate() }}
            placeholder="What should the writer improve? e.g. 'Add more examples in the conclusion, focus less on history'"
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={handleRegenerate}
              disabled={!feedback.trim()}
              className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Regenerate
            </button>
            <button
              onClick={() => { setMode('choose'); setFeedback('') }}
              className="px-2 py-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <span className="ml-auto text-[10px] text-slate-600">⌘↵ to submit</span>
          </div>
        </div>
      )}
    </div>
  )
}
