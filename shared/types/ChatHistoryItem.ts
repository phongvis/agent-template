import { JsonValue, RecordsDiff, TLRecord } from 'tldraw'
import { SimpleShape } from '../format/SimpleShape'
import { AgentAction } from './AgentAction'
import { ContextItem } from './ContextItem'
import { Streaming } from './Streaming'

export type ChatHistoryItem =
	| ChatHistoryActionItem
	| ChatHistoryPromptItem
	| ChatHistoryContinuationItem
	| ChatHistoryReferenceItem

/**
 * A prompt from the user.
 */
export interface ChatHistoryPromptItem {
	type: 'prompt'
	message: string
	contextItems: ContextItem[]
	selectedShapes: SimpleShape[]
	id?: string
}

/**
 * An action done by the agent.
 */
export interface ChatHistoryActionItem {
	type: 'action'
	action: Streaming<AgentAction>
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
}

/**
 * A follow-up request from the agent, with data retrieved from the previous request.
 */
export interface ChatHistoryContinuationItem {
	type: 'continuation'
	data: JsonValue[]
}

/**
 * A frozen snapshot of the canvas preserved for reference.
 */
export interface ChatHistoryReferenceItem {
	type: 'reference'
	id: string
	title: string
	description?: string
	image?: {
		kind: 'data-url' | 'svg'
		data: string
	}
}
