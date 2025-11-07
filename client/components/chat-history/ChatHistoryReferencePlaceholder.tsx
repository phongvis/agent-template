import { ChatHistoryReferenceItem } from '../../../shared/types/ChatHistoryItem'

export function ChatHistoryReferenceCard({ item }: { item: ChatHistoryReferenceItem }) {
	const { title, description, image } = item
	return (
		<figure className="chat-history-reference" aria-label={`${title} reference snapshot`}>
			<header className="chat-history-reference__header">
				<div className="chat-history-reference__title">{title}</div>
				<span className="chat-history-reference__badge">Reference</span>
			</header>
			{description && (
				<figcaption className="chat-history-reference__description">{description}</figcaption>
			)}
			{image ? (
				<div className="chat-history-reference__media">
					<img
						src={image.data}
						className="chat-history-reference__image"
						alt={title}
						loading="lazy"
					/>
				</div>
			) : (
				<div className="chat-history-reference__placeholder">Snapshot preview coming soon…</div>
			)}
		</figure>
	)
}
