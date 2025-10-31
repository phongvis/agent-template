import { T } from '@tldraw/validate'
import {
	RecordProps,
	TLBaseShape,
	createShapePropsMigrationIds,
	createShapePropsMigrationSequence,
} from '@tldraw/tlschema'
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'

export const BAR_CHART_SHAPE_TYPE = 'bar-chart' as const

export interface TLBarChartBarProps {
	id: string
	label: string
	value: number
	color?: string
}

export interface TLBarChartShapeProps {
	w: number
	h: number
	title: string
	xAxisLabel: string
	yAxisLabel: string
	bars: TLBarChartBarProps[]
	barPadding: number
	marginTop: number
	marginRight: number
	marginBottom: number
	marginLeft: number
	tickCount: number
	maxValue?: number
}

export type TLBarChartShape = TLBaseShape<typeof BAR_CHART_SHAPE_TYPE, TLBarChartShapeProps>

export const BAR_CHART_DEFAULT_MARGINS = {
	top: 32,
	right: 16,
	bottom: 48,
	left: 48,
}

export const BAR_CHART_DEFAULT_PADDING = 0.18
export const BAR_CHART_DEFAULT_TICK_COUNT = 5

export const BAR_CHART_DEFAULT_BARS: TLBarChartBarProps[] = [
	{ id: 'bar-1', label: 'A', value: 12, color: '#6366f1' },
	{ id: 'bar-2', label: 'B', value: 18, color: '#10b981' },
	{ id: 'bar-3', label: 'C', value: 9, color: '#f59e0b' },
]

export const BAR_CHART_DEFAULT_PROPS: TLBarChartShapeProps = {
	w: 420,
	h: 280,
	title: 'Sample Bar Chart',
	xAxisLabel: 'Category',
	yAxisLabel: 'Value',
	bars: BAR_CHART_DEFAULT_BARS,
	barPadding: BAR_CHART_DEFAULT_PADDING,
	marginTop: BAR_CHART_DEFAULT_MARGINS.top,
	marginRight: BAR_CHART_DEFAULT_MARGINS.right,
	marginBottom: BAR_CHART_DEFAULT_MARGINS.bottom,
	marginLeft: BAR_CHART_DEFAULT_MARGINS.left,
	tickCount: BAR_CHART_DEFAULT_TICK_COUNT,
	maxValue: undefined,
}

export const barChartShapeProps: RecordProps<TLBarChartShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	title: T.string,
	xAxisLabel: T.string,
	yAxisLabel: T.string,
	bars: T.arrayOf(
		T.object({
			id: T.string,
			label: T.string,
			value: T.number,
			color: T.string.optional(),
		})
	),
	barPadding: T.number,
	marginTop: T.number,
	marginRight: T.number,
	marginBottom: T.number,
	marginLeft: T.number,
	tickCount: T.number,
	maxValue: T.number.optional(),
}

const Versions = createShapePropsMigrationIds(BAR_CHART_SHAPE_TYPE, {})

export const barChartShapeMigrations = createShapePropsMigrationSequence({
	sequence: [],
})

export interface BarChartLayoutBar {
	barId: string
	label: string
	value: number
	color?: string
	percentage: number
	relativeX: number
	relativeWidth: number
	relativeHeight: number
}

export interface BarChartLayoutTick {
	value: number
	relativeYFromBase: number
}

export interface BarChartLayout {
	bars: BarChartLayoutBar[]
	ticks: BarChartLayoutTick[]
	maxValue: number
	innerWidth: number
	innerHeight: number
	margins: { top: number; right: number; bottom: number; left: number }
}

export function createDefaultBarChartProps(): TLBarChartShapeProps {
	return {
		...BAR_CHART_DEFAULT_PROPS,
		bars: BAR_CHART_DEFAULT_BARS.map((bar) => ({ ...bar })),
	}
}

export function ensureBarIds(bars: TLBarChartBarProps[]): TLBarChartBarProps[] {
	return bars.map((bar, index) => ({
		id: bar.id || `bar-${index + 1}`,
		label: bar.label,
		value: bar.value,
		color: bar.color,
	}))
}

export function computeBarChartLayout(props: TLBarChartShapeProps): BarChartLayout {
	const margins = {
		top: props.marginTop ?? BAR_CHART_DEFAULT_MARGINS.top,
		right: props.marginRight ?? BAR_CHART_DEFAULT_MARGINS.right,
		bottom: props.marginBottom ?? BAR_CHART_DEFAULT_MARGINS.bottom,
		left: props.marginLeft ?? BAR_CHART_DEFAULT_MARGINS.left,
	}

	const width = Math.max(props.w, 1)
	const height = Math.max(props.h, 1)
	const innerWidth = Math.max(width - margins.left - margins.right, 1)
	const innerHeight = Math.max(height - margins.top - margins.bottom, 1)

	const bars = (props.bars.length ? props.bars : BAR_CHART_DEFAULT_BARS).map(
		(bar: TLBarChartBarProps, index: number) => ({
			...bar,
			id: bar.id || `bar-${index + 1}`,
		})
	)

	const maxValue = Math.max(
		props.maxValue ?? max(bars, (bar: TLBarChartBarProps) => bar.value) ?? 1,
		1
	)
	const padding = Math.min(Math.max(props.barPadding ?? BAR_CHART_DEFAULT_PADDING, 0), 0.5)
	const effectivePadding = bars.length > 1 ? padding : 0

	const xScale = scaleBand<string>()
		.domain(bars.map((bar) => bar.id))
		.range([0, innerWidth])
		.padding(effectivePadding)
		.align(0.5)

	const yScale = scaleLinear()
		.domain([0, maxValue])
		.range([innerHeight, 0])

	const layoutBars: BarChartLayoutBar[] = bars.map((bar) => {
		const x = xScale(bar.id) ?? 0
		const y = yScale(bar.value)
		const bandwidth = xScale.bandwidth()
		const barHeight = innerHeight - y
		const percentage = maxValue === 0 ? 0 : bar.value / maxValue
		return {
			barId: bar.id,
			label: bar.label,
			value: bar.value,
			color: bar.color,
			percentage,
			relativeX: innerWidth === 0 ? 0 : x / innerWidth,
			relativeWidth: innerWidth === 0 ? 0 : bandwidth / innerWidth,
			relativeHeight: innerHeight === 0 ? 0 : barHeight / innerHeight,
		}
	})

	const tickCount = Math.max(2, Math.round(props.tickCount ?? BAR_CHART_DEFAULT_TICK_COUNT))
	const ticks = yScale.ticks(tickCount)
	const layoutTicks: BarChartLayoutTick[] = ticks.map((value: number) => ({
		value,
		relativeYFromBase: maxValue === 0 ? 0 : value / maxValue,
	}))

	return {
		bars: layoutBars,
		ticks: layoutTicks,
		maxValue,
		innerWidth,
		innerHeight,
		margins,
	}
}
