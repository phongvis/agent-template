import {
	ChatHistoryActionItem,
	ChatHistoryContinuationItem,
	ChatHistoryItem,
	ChatHistoryPromptItem,
	ChatHistoryReferenceItem,
} from '../../../shared/types/ChatHistoryItem'

export interface ChatHistorySection {
	prompt: ChatHistoryPromptItem
	items: (ChatHistoryActionItem | ChatHistoryContinuationItem | ChatHistoryReferenceItem)[]
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
