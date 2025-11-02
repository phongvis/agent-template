import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	DefaultSizeStyle,
	ErrorBoundary,
	TLComponents,
	Tldraw,
	TldrawUiToastsProvider,
	TLUiOverrides,
	useEditor,
	react,
} from 'tldraw'
import { TldrawAgent } from './agent/TldrawAgent'
import { useTldrawAgent } from './agent/useTldrawAgent'
import { RadarExperience } from './components/radar/RadarExperience'
import { ChatPanelFallback } from './components/ChatPanelFallback'
import { AgentViewportBoundsHighlight } from './components/highlights/AgentViewportBoundsHighlights'
import { ContextHighlights } from './components/highlights/ContextHighlights'
import { enableLinedFillStyle } from './enableLinedFillStyle'
import { BarChartShapeUtil } from './shapes/BarChartShapeUtil'
import { TargetAreaTool } from './tools/TargetAreaTool'
import { TargetShapeTool } from './tools/TargetShapeTool'
import './radar.css'

const RADAR_AGENT_ID = 'radar-agent'

DefaultSizeStyle.setDefaultValue('s')
enableLinedFillStyle()

const tools = [TargetShapeTool, TargetAreaTool]
const overrides: TLUiOverrides = {
	tools: (editor, baseTools) => ({
		...baseTools,
		'target-area': {
			id: 'target-area',
			label: 'Pick Area',
			kbd: 'c',
			icon: 'tool-frame',
			onSelect() {
				editor.setCurrentTool('target-area')
			},
		},
		'target-shape': {
			id: 'target-shape',
			label: 'Pick Shape',
			kbd: 's',
			icon: 'tool-frame',
			onSelect() {
				editor.setCurrentTool('target-shape')
			},
		},
	}),
}

function AppRadar() {
	const [agent, setAgent] = useState<TldrawAgent | undefined>()
	const [canvasVisible, setCanvasVisible] = useState(false)
	const [canvasHost, setCanvasHost] = useState<HTMLDivElement | null>(null)
	const [fallbackCanvas, setFallbackCanvas] = useState<HTMLDivElement | null>(null)
	const fallbackParentRef = useRef<HTMLElement | null>(null)
	const rootRef = useRef<HTMLDivElement | null>(null)

	const handleFallbackCanvasRef = useCallback((node: HTMLDivElement | null) => {
		setFallbackCanvas(node)
		if (node && !fallbackParentRef.current) {
			fallbackParentRef.current = node.parentElement ?? null
		}
	}, [])

	useEffect(() => {
		if (!agent) {
			setCanvasVisible(false)
			return
		}
		setCanvasVisible(agent.$radarHasVisuals.get())
		const dispose = react('radar:has-visuals', () => {
			setCanvasVisible(agent.$radarHasVisuals.get())
		})
		return () => dispose()
	}, [agent])

	const components: TLComponents = useMemo(() => {
		return {
			InFrontOfTheCanvas: () => (
				<>
					{agent && <AgentViewportBoundsHighlight agent={agent} />}
					{agent && <ContextHighlights agent={agent} />}
				</>
			),
		}
	}, [agent])

	const shapeUtils = useMemo(() => [BarChartShapeUtil], [])

	const rootClassName = canvasVisible ? 'radar-root radar-root--canvas' : 'radar-root'

	useEffect(() => {
		const node = fallbackCanvas
		const originalParent = fallbackParentRef.current ?? rootRef.current
		if (!node || !originalParent) return

		if (canvasVisible && canvasHost) {
			if (node.parentElement !== canvasHost) {
				canvasHost.appendChild(node)
			}
			node.classList.add('radar-canvas-fallback--active')
		} else {
			if (node.parentElement !== originalParent) {
				originalParent.insertBefore(node, originalParent.firstChild ?? null)
			}
			node.classList.remove('radar-canvas-fallback--active')
		}
	}, [canvasVisible, canvasHost, fallbackCanvas])

	useEffect(() => {
		const node = fallbackCanvas
		const originalParent = fallbackParentRef.current ?? rootRef.current
		if (!node || !originalParent) return

		return () => {
			node.classList.remove('radar-canvas-fallback--active')
			if (node.parentElement !== originalParent) {
				originalParent.appendChild(node)
			}
		}
	}, [fallbackCanvas])

	const canvasPortal =
		fallbackCanvas &&
		createPortal(
			<div
				className={
					canvasVisible
						? 'radar-canvas-inline radar-canvas-inline--visible'
						: 'radar-canvas-inline radar-canvas-inline--hidden'
				}
			>
				<div className="radar-canvas-stage">
					<Tldraw
						tools={tools}
						overrides={overrides}
						components={components}
						shapeUtils={shapeUtils}
					>
						<RadarAppInner setAgent={setAgent} />
					</Tldraw>
				</div>
			</div>,
			fallbackCanvas
		)

	return (
		<TldrawUiToastsProvider>
			<div ref={rootRef} className={rootClassName}>
				<div ref={handleFallbackCanvasRef} className="radar-canvas-fallback" />
				{canvasPortal}
				<div className="radar-chat-shell">
					<ErrorBoundary fallback={ChatPanelFallback}>
						{agent && (
							<RadarExperience
								agent={agent}
								canvasVisible={canvasVisible}
								onCanvasHostMount={setCanvasHost}
							/>
						)}
					</ErrorBoundary>
				</div>
			</div>
		</TldrawUiToastsProvider>
	)
}

function RadarAppInner({ setAgent }: { setAgent: (agent: TldrawAgent) => void }) {
	const editor = useEditor()
	const agent = useTldrawAgent(editor, RADAR_AGENT_ID)
	const hasInitializedRef = useRef(false)

	useEffect(() => {
		if (!editor || !agent || hasInitializedRef.current) return

		try {
			const storage = window.localStorage
			for (const key of Object.keys(storage)) {
				if (key.includes('radar-canvas') || key.startsWith(`${RADAR_AGENT_ID}:`)) {
					storage.removeItem(key)
				}
			}
		} catch {
			// Ignore storage access failures (e.g. private mode)
		}

		const shapes = editor.getCurrentPageShapes()
		if (shapes.length > 0) {
			editor.deleteShapes(shapes.map((shape) => shape.id))
		}

		agent.reset()
		setAgent(agent)
		;(window as any).editor = editor
		;(window as any).agent = agent
		hasInitializedRef.current = true
	}, [agent, editor, setAgent])

	return null
}

export default AppRadar
