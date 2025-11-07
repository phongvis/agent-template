import {
	ChatHistoryActionItem,
	ChatHistoryContinuationItem,
	ChatHistoryItem,
	ChatHistoryPromptItem,
 	ChatHistoryReferenceItem,
} from '../../../shared/types/ChatHistoryItem'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { SmallSpinner } from '../icons/SmallSpinner'
import { ChatHistoryGroup, getActionHistoryGroups } from './ChatHistoryGroup'
import { ChatHistoryPrompt } from './ChatHistoryPrompt'
import { ChatHistoryReferenceCard } from './ChatHistoryReferencePlaceholder'

export interface ChatHistorySection {
	prompt: ChatHistoryPromptItem
	items: (ChatHistoryActionItem | ChatHistoryContinuationItem | ChatHistoryReferenceItem)[]
}

export function ChatHistorySection({
	section,
	agent,
	loading,
}: {
	section: ChatHistorySection
	agent: TldrawAgent
	loading: boolean
}) {
	const actions = section.items.filter((item) => item.type === 'action')
	const groups = getActionHistoryGroups(actions, agent)
	const references = section.items.filter((item): item is ChatHistoryReferenceItem => item.type === 'reference')
	return (
		<div className="chat-history-section">
			<ChatHistoryPrompt item={section.prompt} editor={agent.editor} />
			{groups.map((group, i) => {
				return <ChatHistoryGroup key={'chat-history-group-' + i} group={group} agent={agent} />
			})}
			{references.map((item) => (
				<ChatHistoryReferenceCard key={item.id} item={item} />
			))}
			{loading && <SmallSpinner />}
		</div>
	)
}

export function getAgentHistorySections(items: ChatHistoryItem[]): ChatHistorySection[] {
	const sections: ChatHistorySection[] = []

	for (const item of items) {
		if (item.type === 'prompt') {
			sections.push({ prompt: item, items: [] })
			continue
		}

		const currentSection = sections.at(-1)
		if (!currentSection) {
			continue
		}
		currentSection.items.push(item)
	}

	return sections
}
