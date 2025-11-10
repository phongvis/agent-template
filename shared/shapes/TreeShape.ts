import { T } from '@tldraw/validate'
import {
	RecordProps,
	TLBaseShape,
	createShapePropsMigrationIds,
	createShapePropsMigrationSequence,
} from '@tldraw/tlschema'
import { hierarchy, tree, HierarchyPointLink, HierarchyPointNode } from 'd3-hierarchy'

export const TREE_SHAPE_TYPE = 'tree-diagram' as const

export type TreeOrientation = 'vertical' | 'horizontal'

export interface TLTreeNodeProps {
	id: string
	label: string
	parentId?: string
	color?: string
}

export interface TLTreeShapeProps {
	w: number
	h: number
	nodes: TLTreeNodeProps[]
	marginTop: number
	marginRight: number
	marginBottom: number
	marginLeft: number
	orientation: string
	nodeRadius: number
	separation: number
	cousinSeparation: number
}

export type TLTreeShape = TLBaseShape<typeof TREE_SHAPE_TYPE, TLTreeShapeProps>

export const TREE_DEFAULT_MARGINS = {
	top: 48,
	right: 64,
	bottom: 64,
	left: 64,
}

export const TREE_DEFAULT_ORIENTATION: TreeOrientation = 'horizontal'
export const TREE_DEFAULT_NODE_RADIUS = 14
export const TREE_DEFAULT_SEPARATION = 1.15
export const TREE_DEFAULT_COUSIN_SEPARATION = 1.6

export const TREE_DEFAULT_NODES: TLTreeNodeProps[] = [
	{ id: 'root', label: 'Root', parentId: undefined },
	{ id: 'branch-1', label: 'Branch A', parentId: 'root' },
	{ id: 'branch-2', label: 'Branch B', parentId: 'root' },
	{ id: 'leaf-1', label: 'Leaf 1', parentId: 'branch-1' },
	{ id: 'leaf-2', label: 'Leaf 2', parentId: 'branch-1' },
	{ id: 'leaf-3', label: 'Leaf 3', parentId: 'branch-2' },
]

export const TREE_DEFAULT_PROPS: TLTreeShapeProps = {
	w: 520,
	h: 420,
	nodes: TREE_DEFAULT_NODES,
	marginTop: TREE_DEFAULT_MARGINS.top,
	marginRight: TREE_DEFAULT_MARGINS.right,
	marginBottom: TREE_DEFAULT_MARGINS.bottom,
	marginLeft: TREE_DEFAULT_MARGINS.left,
	orientation: TREE_DEFAULT_ORIENTATION,
	nodeRadius: TREE_DEFAULT_NODE_RADIUS,
	separation: TREE_DEFAULT_SEPARATION,
	cousinSeparation: TREE_DEFAULT_COUSIN_SEPARATION,
}

export const treeShapeProps: RecordProps<TLTreeShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	nodes: T.arrayOf(
		T.object({
			id: T.string,
			label: T.string,
			parentId: T.string.optional(),
			color: T.string.optional(),
		})
	),
	marginTop: T.number,
	marginRight: T.number,
	marginBottom: T.number,
	marginLeft: T.number,
	orientation: T.string,
	nodeRadius: T.number,
	separation: T.number,
	cousinSeparation: T.number,
}

const Versions = createShapePropsMigrationIds(TREE_SHAPE_TYPE, {})

export const treeShapeMigrations = createShapePropsMigrationSequence({
	sequence: [],
})

export interface TreeLayoutNode {
	nodeId: string
	label: string
	parentId: string | null
	depth: number
	x: number
	y: number
	relativeX: number
	relativeY: number
	hasChildren: boolean
	color?: string
}

export interface TreeLayoutEndpoint {
	x: number
	y: number
	relativeX: number
	relativeY: number
}

export interface TreeLayoutLink {
	sourceId: string
	targetId: string
	source: TreeLayoutEndpoint
	target: TreeLayoutEndpoint
}

export interface TreeLayout {
	nodes: TreeLayoutNode[]
	links: TreeLayoutLink[]
	innerWidth: number
	innerHeight: number
	margins: { top: number; right: number; bottom: number; left: number }
	orientation: TreeOrientation
}

const SYNTHETIC_ROOT_ID = '__tree-root__'

type TreeNodeDatum = TLTreeNodeProps & { children: TreeNodeDatum[] }

export function createDefaultTreeProps(): TLTreeShapeProps {
	return {
		...TREE_DEFAULT_PROPS,
		nodes: TREE_DEFAULT_PROPS.nodes.map((node) => ({ ...node })),
	}
}

export function normalizeTreeNodes(nodes: TLTreeNodeProps[]): TLTreeNodeProps[] {
	const ids = new Set<string>()
	return nodes.map((node, index) => {
		let id = node.id?.trim()
		if (!id) {
			id = `node-${index + 1}`
		}
		if (ids.has(id)) {
			let counter = 1
			let candidate = `${id}-${counter}`
			while (ids.has(candidate)) {
				counter += 1
				candidate = `${id}-${counter}`
			}
			id = candidate
		}
		ids.add(id)
		return {
			id,
			label: node.label ?? `Node ${index + 1}`,
			parentId: node.parentId?.trim() || undefined,
			color: node.color,
		}
	})
}

function buildHierarchy(nodes: TLTreeNodeProps[]): { root: TreeNodeDatum; synthetic: boolean } {
	const clonedNodes = normalizeTreeNodes(nodes).map((node) => ({ ...node, children: [] as TreeNodeDatum[] }))
	const nodeMap = new Map<string, TreeNodeDatum>()
	clonedNodes.forEach((node) => {
		nodeMap.set(node.id, node)
	})

	const roots: TreeNodeDatum[] = []

	for (const node of clonedNodes) {
		if (node.parentId && nodeMap.has(node.parentId)) {
			nodeMap.get(node.parentId)!.children.push(node)
		} else {
			roots.push(node)
		}
	}

	if (roots.length === 0) {
		const [first] = clonedNodes
		if (first) {
			return { root: first, synthetic: false }
		}
		const fallback: TreeNodeDatum = {
			id: 'tree-root',
			label: 'Root',
			parentId: undefined,
			children: [],
		}
		return { root: fallback, synthetic: false }
	}

	if (roots.length === 1) {
		return { root: roots[0], synthetic: false }
	}

	return {
		root: {
			id: SYNTHETIC_ROOT_ID,
			label: 'Tree',
			parentId: undefined,
			children: roots,
		},
		synthetic: true,
	}
}

export function computeTreeLayout(props: TLTreeShapeProps): TreeLayout {
	const margins = {
		top: props.marginTop ?? TREE_DEFAULT_MARGINS.top,
		right: props.marginRight ?? TREE_DEFAULT_MARGINS.right,
		bottom: props.marginBottom ?? TREE_DEFAULT_MARGINS.bottom,
		left: props.marginLeft ?? TREE_DEFAULT_MARGINS.left,
	}

	const width = Math.max(props.w, 1)
	const height = Math.max(props.h, 1)
	const innerWidth = Math.max(width - margins.left - margins.right, 1)
	const innerHeight = Math.max(height - margins.top - margins.bottom, 1)

	const { root: rootDatum, synthetic } = buildHierarchy(props.nodes)
	const layoutTree = tree<TreeNodeDatum>()
		.separation((a: HierarchyPointNode<TreeNodeDatum>, b: HierarchyPointNode<TreeNodeDatum>) => {
			const base = a.parent === b.parent ? props.separation : props.cousinSeparation
			return Math.max(base, 0.5)
		})

	const orientation: TreeOrientation = props.orientation === 'vertical' ? 'vertical' : 'horizontal'
	if (orientation === 'vertical') {
		layoutTree.size([innerWidth, innerHeight])
	} else {
		layoutTree.size([innerHeight, innerWidth])
	}

	const hierarchyRoot = hierarchy<TreeNodeDatum>(rootDatum, (node: TreeNodeDatum) => node.children)
	layoutTree(hierarchyRoot)

	const depthOffset = synthetic ? -1 : 0
	const nodes: TreeLayoutNode[] = []

	const filteredNodes = synthetic
		? hierarchyRoot
				.descendants()
				.filter((node: HierarchyPointNode<TreeNodeDatum>) => node.data.id !== SYNTHETIC_ROOT_ID)
		: hierarchyRoot.descendants()

	for (const node of filteredNodes) {
		const position = projectNodePosition(node, margins, orientation)
		const relativeX = clamp01(position.x / width)
		const relativeY = clamp01(position.y / height)
		nodes.push({
			nodeId: node.data.id,
			label: node.data.label,
			parentId: node.data.parentId ?? null,
			depth: Math.max(node.depth + depthOffset, 0),
			x: position.x,
			y: position.y,
			relativeX,
			relativeY,
			hasChildren: Boolean(node.children && node.children.length > 0),
			color: node.data.color,
		})
	}

	const links: TreeLayoutLink[] = []
	const hierarchyLinks = synthetic
		? hierarchyRoot
				.links()
				.filter((link: HierarchyPointLink<TreeNodeDatum>) => filterSyntheticLinks(link))
		: hierarchyRoot.links()

	for (const link of hierarchyLinks) {
		const endpoints = projectLinkEndpoints(link, margins, orientation)
		links.push({
			sourceId: link.source.data.id,
			targetId: link.target.data.id,
			source: {
				x: endpoints.source.x,
				y: endpoints.source.y,
				relativeX: clamp01(endpoints.source.x / width),
				relativeY: clamp01(endpoints.source.y / height),
			},
			target: {
				x: endpoints.target.x,
				y: endpoints.target.y,
				relativeX: clamp01(endpoints.target.x / width),
				relativeY: clamp01(endpoints.target.y / height),
			},
		})
	}

	return {
		nodes,
		links,
		innerWidth,
		innerHeight,
		margins,
		orientation,
	}
}

function filterSyntheticLinks(link: HierarchyPointLink<TreeNodeDatum>): boolean {
	return link.source.data.id !== SYNTHETIC_ROOT_ID && link.target.data.id !== SYNTHETIC_ROOT_ID
}

function projectNodePosition(
	node: HierarchyPointNode<TreeNodeDatum>,
	margins: { top: number; right: number; bottom: number; left: number },
	orientation: TreeOrientation
) {
	if (orientation === 'vertical') {
		return {
			x: margins.left + node.x,
			y: margins.top + node.y,
		}
	}
	return {
		x: margins.left + node.y,
		y: margins.top + node.x,
	}
}

function projectLinkEndpoints(
	link: HierarchyPointLink<TreeNodeDatum>,
	margins: { top: number; right: number; bottom: number; left: number },
	orientation: TreeOrientation
) {
	const source = projectNodePosition(link.source, margins, orientation)
	const target = projectNodePosition(link.target, margins, orientation)

	return {
		source,
		target,
	}
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value))
}
