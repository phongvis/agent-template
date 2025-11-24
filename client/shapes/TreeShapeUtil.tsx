import { useEffect, useMemo, useRef } from 'react'
import { select } from 'd3-selection'
import { BaseBoxShapeUtil, HTMLContainer } from '@tldraw/editor'
import {
	TREE_SHAPE_TYPE,
	TLTreeShape,
	treeShapeMigrations,
	treeShapeProps,
	createDefaultTreeProps,
	computeTreeLayout,
	TreeLayoutLink,
	TreeLayoutNode,
} from '../../shared/shapes/TreeShape'

export class TreeShapeUtil extends BaseBoxShapeUtil<TLTreeShape> {
	static override type = TREE_SHAPE_TYPE
	static override props = treeShapeProps
	static override migrations = treeShapeMigrations

	override hideSelectionBoundsFg(): boolean {
		return false
	}

	override getDefaultProps(): TLTreeShape['props'] {
		return createDefaultTreeProps()
	}

	override component(shape: TLTreeShape) {
		return (
			<HTMLContainer className="tl-tree-diagram">
				<TreeRenderer shape={shape} />
			</HTMLContainer>
		)
	}

	override indicator(shape: TLTreeShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
	}
}

function TreeRenderer({ shape }: { shape: TLTreeShape }) {
	const svgRef = useRef<SVGSVGElement | null>(null)
	const layout = useMemo(() => computeTreeLayout(shape.props), [shape.props])

	useEffect(() => {
		if (!svgRef.current) return

		const svg = select(svgRef.current)
		svg.selectAll('*').remove()

		svg.attr('viewBox', `0 0 ${shape.props.w} ${shape.props.h}`)
		svg.attr('width', shape.props.w)
		svg.attr('height', shape.props.h)

		const rootGroup = svg.append('g').attr('class', 'tl-tree-diagram__root')

		rootGroup
			.append('g')
			.attr('class', 'tl-tree-diagram__links')
			.selectAll<SVGPathElement, TreeLayoutLink>('path')
			.data<TreeLayoutLink>(layout.links, (link) => `${link.sourceId}-${link.targetId}`)
			.join('path')
			.attr('class', 'tl-tree-diagram__link')
			.attr('d', (link: TreeLayoutLink) => linkToPath(link))

		const nodeGroups = rootGroup
			.append('g')
			.attr('class', 'tl-tree-diagram__nodes')
			.selectAll<SVGGElement, TreeLayoutNode>('g')
			.data<TreeLayoutNode>(layout.nodes, (node) => node.nodeId)
			.join('g')
			.attr('class', 'tl-tree-diagram__node')
			.attr('transform', (node: TreeLayoutNode) => `translate(${node.x}, ${node.y})`)

		nodeGroups
			.append('circle')
			.attr('class', 'tl-tree-diagram__node-circle')
			.attr('r', shape.props.nodeRadius)
			.attr('fill', (node: TreeLayoutNode) => node.color ?? '#ffffff')
			.attr('stroke', '#1f2937')
			.attr('stroke-width', 1.25)
			.attr('shape-rendering', 'geometricPrecision')

		const labels = nodeGroups
			.append('text')
			.attr('class', 'tl-tree-diagram__label')
			.attr('fill', '#111827')
			.attr('font-size', 13)
			.attr('font-weight', 500)
			.attr('shape-rendering', 'geometricPrecision')
			.text((node: TreeLayoutNode) => node.label)

		labels
			.attr('text-anchor', 'start')
			.attr('x', shape.props.nodeRadius + 14)
			.attr('y', 2)
			.attr('dominant-baseline', 'middle')

		nodeGroups
			.append('title')
			.text((node: TreeLayoutNode) => node.label)
	}, [layout, shape.props])

	return <svg ref={svgRef} className="tl-tree-diagram__svg" />
}

function linkToPath(link: TreeLayoutLink): string {
	const { source, target } = link
	const midX = (source.x + target.x) / 2
	return `M${source.x},${source.y}C${midX},${source.y} ${midX},${target.y} ${target.x},${target.y}`
}
