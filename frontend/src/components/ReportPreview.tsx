import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ReportPreviewProps {
  report: string
  isComplete: boolean
}

export function ReportPreview({ report, isComplete }: ReportPreviewProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Final Report</h2>
        {isComplete && (
          <span className="rounded-full border border-emerald-800 bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            Approved
          </span>
        )}
      </div>
      <article className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-headings:text-slate-100 prose-h1:text-xl prose-h2:text-base prose-h3:text-sm prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-slate-200 prose-code:text-indigo-300 prose-hr:border-slate-800 prose-a:text-indigo-400">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
      </article>
    </div>
  )
}
