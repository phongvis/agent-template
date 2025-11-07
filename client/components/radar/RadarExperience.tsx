import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { useValue } from 'tldraw'
import { convertTldrawShapeToSimpleShape } from '../../../shared/format/convertTldrawShapeToSimpleShape'
import { SimpleShape } from '../../../shared/format/SimpleShape'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { ChatHistoryActionItem, ChatHistoryReferenceItem } from '../../../shared/types/ChatHistoryItem'
import { getAgentHistorySections } from '../chat-history/ChatHistorySection'
import { getActionInfo } from '../chat-history/getActionInfo'
import { ChatHistoryReferenceCard } from '../chat-history/ChatHistoryReferencePlaceholder'

export function RadarExperience({
	agent,
	canvasVisible,
	onCanvasHostMount,
}: {
	agent: TldrawAgent
	canvasVisible: boolean
	onCanvasHostMount: (element: HTMLDivElement | null) => void
}) {
	const history = useValue(agent.$chatHistory)
	const sections = useMemo(() => getAgentHistorySections(history), [history])
	const canvasContext = useValue(agent.$radarCanvasContext)
	const conversationRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!canvasVisible) {
			onCanvasHostMount(null)
		}
	}, [canvasVisible, onCanvasHostMount])

	useEffect(() => {
		return () => onCanvasHostMount(null)
	}, [onCanvasHostMount])

	useEffect(() => {
		if (conversationRef.current) {
			conversationRef.current.scrollTop = conversationRef.current.scrollHeight
		}
	}, [sections])

	const canvasAnchorRef = useCallback(
		(node: HTMLDivElement | null) => {
			onCanvasHostMount(node)
		},
		[onCanvasHostMount]
	)

	return (
		<div className="radar-experience">
			<div className="radar-conversation" ref={conversationRef}>
				{sections.map((section, index) => {
					const isCanvasSection = Boolean(
						canvasVisible &&
						canvasContext &&
						((canvasContext.promptId && section.prompt.id === canvasContext.promptId) ||
							(!canvasContext.promptId && section.prompt.message === canvasContext.promptMessage))
					)
					const showCanvas = isCanvasSection && canvasVisible
					return (
						<RadarThread
							key={section.prompt.id ?? `prompt-${index}`}
							sectionIndex={index}
							section={section}
							agent={agent}
							showCanvas={showCanvas}
							canvasAnchorRef={showCanvas ? canvasAnchorRef : undefined}
						/>
					)
				})}
			</div>
			<RadarPromptForm agent={agent} />
		</div>
	)
}

function RadarThread({
	section,
	sectionIndex,
	agent,
	showCanvas,
	canvasAnchorRef,
}: {
	section: ReturnType<typeof getAgentHistorySections>[number]
	sectionIndex: number
	agent: TldrawAgent
	showCanvas: boolean
	canvasAnchorRef?: (element: HTMLDivElement | null) => void
}) {
	const actionSummaries = useMemo(() => {
		return section.items
			.filter((item): item is ChatHistoryActionItem => item.type === 'action' && item.action._type === 'message')
			.map((item) => getActionInfo(item.action, agent))
			.map((info) => info.description)
			.filter((value): value is string => Boolean(value))
	}, [section.items, agent, showCanvas])

	const references = useMemo(() => {
		return section.items.filter((item): item is ChatHistoryReferenceItem => item.type === 'reference')
	}, [section.items])

	return (
		<section className="radar-thread">
			<div className="radar-message radar-message--user">
				<p>{section.prompt.message}</p>
			</div>
			{actionSummaries.length > 0 && (
				<div className="radar-message radar-message--agent">
					{actionSummaries.map((description, idx) => (
						<Markdown key={`summary-${sectionIndex}-${idx}`}>{description}</Markdown>
					))}
				</div>
			)}
			{references.length > 0 && (
				<div className="radar-reference-list">
					{references.map((reference) => (
						<ChatHistoryReferenceCard key={reference.id} item={reference} />
					))}
				</div>
			)}
			{showCanvas && (
				<div
					className="radar-canvas-anchor radar-canvas-anchor--visible"
					ref={canvasAnchorRef}
				/>
			)}
		</section>
	)
}

function RadarPromptForm({ agent }: { agent: TldrawAgent }) {
	const { editor } = agent
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [value, setValue] = useState('')
	const isGenerating = useValue('radar:isGenerating', () => agent.isGenerating(), [agent])
	const modelName = useValue(agent.$modelName)

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault()
		const trimmed = value.trim()
		if (trimmed === '') {
			agent.cancel()
			return
		}

		const contextItems = agent.$contextItems.get()
		agent.$contextItems.set([])

		const selectedShapes: SimpleShape[] = editor
			.getSelectedShapes()
			.map((shape) => convertTldrawShapeToSimpleShape(editor, shape))

		setValue('')
		if (textareaRef.current) {
			textareaRef.current.value = ''
		}

		void agent.prompt({
			message: trimmed,
			contextItems,
			bounds: editor.getViewportPageBounds(),
			modelName,
			selectedShapes,
			type: 'user',
		})
	}

	return (
		<form className="radar-prompt-form" onSubmit={handleSubmit}>
			<textarea
				ref={textareaRef}
				value={value}
				onChange={(event) => setValue(event.currentTarget.value)}
				autoComplete="off"
				rows={3}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault()
						event.currentTarget.form?.requestSubmit()
					}
				}}
			/>
			<div className="radar-prompt-actions">
				<div className="radar-prompt-meta" />
				<button type="submit" className="radar-button" disabled={value.trim() === '' && !isGenerating}>
					{isGenerating && value.trim() === '' ? 'Stop' : 'Send'}
				</button>
			</div>
		</form>
	)
}
