import { useEffect, useMemo, useRef } from 'react'
import { axisBottom, axisLeft } from 'd3-axis'
import { select } from 'd3-selection'
import { scaleBand, scaleLinear } from 'd3-scale'
import { BaseBoxShapeUtil, HTMLContainer } from '@tldraw/editor'
import {
	BAR_CHART_SHAPE_TYPE,
	BarChartLayout,
	BarChartLayoutBar,
	TLBarChartShape,
	computeBarChartLayout,
	createDefaultBarChartProps,
	barChartShapeMigrations,
	barChartShapeProps,
} from '../../shared/shapes/BarChartShape'

export class BarChartShapeUtil extends BaseBoxShapeUtil<TLBarChartShape> {
	static override type = BAR_CHART_SHAPE_TYPE
	static override props = barChartShapeProps
	static override migrations = barChartShapeMigrations

	override hideSelectionBoundsFg(): boolean {
		return false
	}

	override getDefaultProps(): TLBarChartShape['props'] {
		return createDefaultBarChartProps()
	}

	override component(shape: TLBarChartShape) {
		return (
			<HTMLContainer className="tl-bar-chart">
				<BarChartRenderer shape={shape} />
			</HTMLContainer>
		)
	}

	override indicator(shape: TLBarChartShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
	}
}

function BarChartRenderer({ shape }: { shape: TLBarChartShape }) {
	const svgRef = useRef<SVGSVGElement | null>(null)
	const layout = useMemo<BarChartLayout>(() => computeBarChartLayout(shape.props), [shape.props])

	useEffect(() => {
		if (!svgRef.current) return

		const svg = select(svgRef.current)
		svg.selectAll('*').remove()

		svg.attr('viewBox', `0 0 ${shape.props.w} ${shape.props.h}`)
		svg.attr('width', shape.props.w)
		svg.attr('height', shape.props.h)

		const { margins, innerWidth, innerHeight, maxValue } = layout

		const g = svg
			.append('g')
			.attr('transform', `translate(${margins.left},${margins.top})`)

		const xScale = scaleBand<string>()
			.domain(layout.bars.map((bar) => bar.barId))
			.range([0, innerWidth])
			.padding(shape.props.barPadding)

		const yScale = scaleLinear()
			.domain([0, maxValue])
			.range([innerHeight, 0])

		const axisGroupY = g.append('g').attr('class', 'bar-chart-axis-y')
		axisGroupY.call(
			axisLeft(yScale)
				.tickValues(layout.ticks.map((tick) => tick.value))
				.tickSize(-innerWidth)
		)

		axisGroupY.selectAll('line')
			.attr('stroke', '#d4d4d8')
			.attr('stroke-dasharray', '3,3')

		axisGroupY.selectAll('path').attr('stroke', '#a1a1aa')
		axisGroupY.selectAll('text').attr('fill', '#3f3f46')

		const axisGroupX = g
			.append('g')
			.attr('class', 'bar-chart-axis-x')
			.attr('transform', `translate(0,${innerHeight})`)
		axisGroupX.call(axisBottom(xScale))
		axisGroupX.selectAll('line').attr('stroke', '#a1a1aa')
		axisGroupX.selectAll('path').attr('stroke', '#a1a1aa')
		axisGroupX.selectAll('text').attr('fill', '#3f3f46')

		g.append('g')
			.attr('class', 'bar-chart-bars')
			.selectAll<SVGRectElement, BarChartLayoutBar>('rect')
			.data(layout.bars)
			.join('rect')
			.attr('x', (bar: BarChartLayoutBar) => xScale(bar.barId) ?? 0)
			.attr('y', (bar: BarChartLayoutBar) => yScale(bar.value))
			.attr('width', xScale.bandwidth())
			.attr('height', (bar: BarChartLayoutBar) => innerHeight - yScale(bar.value))
			.attr('fill', (bar: BarChartLayoutBar) => bar.color ?? '#6366f1')
			.attr('rx', 4)

		if (shape.props.title) {
			svg
				.append('text')
				.attr('x', shape.props.w / 2)
				.attr('y', Math.max(20, layout.margins.top * 0.6))
				.attr('text-anchor', 'middle')
				.attr('font-size', 16)
				.attr('font-weight', 600)
				.attr('fill', '#27272a')
				.text(shape.props.title)
		}

		if (shape.props.xAxisLabel) {
			svg
				.append('text')
				.attr('x', shape.props.w / 2)
				.attr('y', shape.props.h - Math.max(12, layout.margins.bottom / 3))
				.attr('text-anchor', 'middle')
				.attr('font-size', 12)
				.attr('fill', '#52525b')
				.text(shape.props.xAxisLabel)
		}

		if (shape.props.yAxisLabel) {
			svg
				.append('text')
				.attr('x', Math.max(12, layout.margins.left / 4))
				.attr('y', shape.props.h / 2)
				.attr('text-anchor', 'middle')
				.attr('font-size', 12)
				.attr('fill', '#52525b')
				.attr('transform', `rotate(-90 ${Math.max(12, layout.margins.left / 4)} ${shape.props.h / 2})`)
				.text(shape.props.yAxisLabel)
		}
	}, [layout, shape.props])

	return <svg ref={svgRef} className="tl-bar-chart__svg" />
}
