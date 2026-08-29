export type Phase = 'idle' | 'researching' | 'review' | 'complete' | 'error'

export type NodeName = 'rag' | 'orchestrator' | 'search' | 'summarizer' | 'writer' | 'hitl' | 'store_report'

export interface AgentStep {
  node: NodeName
  label: string
  status: 'pending' | 'running' | 'done'
}

export interface SSEPayload {
  thread_id?: string
  node?: NodeName
  report?: string
  message?: string
  sub_questions?: string[]
  rag_hits?: number
}
