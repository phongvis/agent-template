import { z } from 'zod'
import { SimpleColor } from './SimpleColor'
import { SimpleFillSchema } from './SimpleFill'
import { SimpleFontSize } from './SimpleFontSize'
import { SimpleGeoShapeTypeSchema } from './SimpleGeoShapeType'
import { BAR_CHART_SHAPE_TYPE } from '../shapes/BarChartShape'

const SimpleLabel = z.string()

export const SimpleGeoShape = z.object({
	_type: SimpleGeoShapeTypeSchema,
	color: SimpleColor,
	fill: SimpleFillSchema,
	h: z.number(),
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel.optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

export type SimpleGeoShape = z.infer<typeof SimpleGeoShape>

const SimpleLineShape = z.object({
	_type: z.literal('line'),
	color: SimpleColor,
	note: z.string(),
	shapeId: z.string(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
})

export type SimpleLineShape = z.infer<typeof SimpleLineShape>

const SimpleNoteShape = z.object({
	_type: z.literal('note'),
	color: SimpleColor,
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel.optional(),
	x: z.number(),
	y: z.number(),
})

export type SimpleNoteShape = z.infer<typeof SimpleNoteShape>

const SimpleTextShape = z.object({
	_type: z.literal('text'),
	color: SimpleColor,
	fontSize: SimpleFontSize.optional(),
	note: z.string(),
	shapeId: z.string(),
	text: SimpleLabel,
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	width: z.number().optional(),
	wrap: z.boolean().optional(),
	x: z.number(),
	y: z.number(),
})

export type SimpleTextShape = z.infer<typeof SimpleTextShape>

const SimpleArrowShape = z.object({
	_type: z.literal('arrow'),
	color: SimpleColor,
	fromId: z.string().nullable(),
	note: z.string(),
	shapeId: z.string(),
	text: z.string().optional(),
	toId: z.string().nullable(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
	bend: z.number().optional(),
})

export type SimpleArrowShape = z.infer<typeof SimpleArrowShape>

const SimpleDrawShape = z
	.object({
		_type: z.literal('draw'),
		color: SimpleColor,
		fill: SimpleFillSchema.optional(),
		note: z.string(),
		shapeId: z.string(),
	})
	.meta({
		title: 'Draw Shape',
		description:
			'A draw shape is a freeform shape that was drawn by the pen tool. To create new draw shapes, the AI must use the pen event because it gives more control.',
	})

export type SimpleDrawShape = z.infer<typeof SimpleDrawShape>

const SimpleUnknownShape = z
	.object({
		_type: z.literal('unknown'),
		note: z.string(),
		shapeId: z.string(),
		subType: z.string(),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Unknown Shape',
		description:
			"A special shape that is not represented by one of the canvas's core shape types. The AI cannot create these shapes, but it *can* interact with them. eg: The AI can move these shapes. The `subType` property contains the internal name of the shape's type.",
	})

export type SimpleUnknownShape = z.infer<typeof SimpleUnknownShape>

const SimpleBarChartBar = z.object({
	barId: z.string(),
	label: z.string(),
	value: z.number(),
	percentage: z.number(),
	relativeX: z.number(),
	relativeWidth: z.number(),
	relativeHeight: z.number(),
	color: z.string().optional(),
})

const SimpleBarChartTick = z.object({
	value: z.number(),
	relativeYFromBase: z.number(),
})

const SimpleBarChartShape = z
	.object({
		_type: z.literal(BAR_CHART_SHAPE_TYPE),
		note: z.string(),
		shapeId: z.string(),
		name: z.string().optional(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
		title: z.string().optional(),
		xAxisLabel: z.string().optional(),
		yAxisLabel: z.string().optional(),
		bars: z.array(SimpleBarChartBar),
		ticks: z.array(SimpleBarChartTick),
		maxValue: z.number(),
		barPadding: z.number(),
		margins: z.object({
			top: z.number(),
			right: z.number(),
			bottom: z.number(),
			left: z.number(),
		}),
	})
	.meta({
		title: 'Bar Chart Shape',
		description:
			'A bar chart shape renders a categorical dataset using vertical bars. The `bars` array describes each bar with its id, label, value, relative placement, and fill color. Relative metrics are expressed as percentages of the chart\'s inner drawing area so the model can reason about proportions.',
	})

export type SimpleBarChartShape = z.infer<typeof SimpleBarChartShape>

const SIMPLE_SHAPES = [
	SimpleDrawShape,
	SimpleGeoShape,
	SimpleLineShape,
	SimpleTextShape,
	SimpleArrowShape,
	SimpleNoteShape,
	SimpleBarChartShape,
	SimpleUnknownShape,
] as const
export const SimpleShapeSchema = z.union(SIMPLE_SHAPES)

export type SimpleShape = z.infer<typeof SimpleShapeSchema>

/**
 * Extract all shape type names from the schema
 */
export function getSimpleShapeSchemaNames() {
	const typeNames: SimpleShape['_type'][] = []

	for (const shapeSchema of SIMPLE_SHAPES) {
		const typeField = shapeSchema.shape._type

		if (typeField) {
			// Handle ZodLiterals (like SimpleDrawShape)
			if ('value' in typeField && typeof typeField.value === 'string') {
				typeNames.push(typeField.value)
			}
			// Handle ZodEnums (like SimpleGeoShape)
			else if ('options' in typeField && Array.isArray(typeField.options)) {
				typeNames.push(...typeField.options)
			}
		}
	}

	return typeNames
}
