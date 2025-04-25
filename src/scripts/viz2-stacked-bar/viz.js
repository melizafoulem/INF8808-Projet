import * as preprocess from '../preprocess.js'
import { VisualizationBase } from '../visualization-base.js'

/**
 * Stacked Bar Chart visualization for chess opening outcomes
 *
 * @augments VisualizationBase
 */
export class StackedBarVisualization extends VisualizationBase {
  /**
   * Create a new stacked bar visualization
   *
   * @param {string} containerId - ID of the container element
   * @param {object} options - Visualization options
   * @param {string} chartType - Type of chart to display ('wins' or 'victory')
   */
  constructor (containerId, options = {}, chartType = 'wins') {
    super(containerId, options)

    this.options = {
      ...this.options,
      numOpenings: 10,
      ...options
    }

    this.margin = this.options.margin || {
      top: 50,
      right: 50,
      bottom: 50,
      left: 80
    }

    this.chartType = chartType

    this.chartGroup = null
    this.legendData = null
  }

  /**
   * Initialize the visualization
   */
  initialize () {
    super.initialize()

    this.chartGroup = this.graphGroup
      .append('g')
      .attr('class', `${this.chartType}-chart-group`)
  }

  /**
   * Draw the stacked bar visualization
   *
   * @param {Array} data - Chess games dataset
   */
  draw (data) {
    this.initialize()

    let processedData, title
    if (this.chartType === 'wins') {
      processedData = preprocess
        .getTopNOpeningsWinners(data, this.options.numOpenings)
        .slice(0, this.options.numOpenings)
      title = 'Répartition des victoires par ouverture'
    } else {
      processedData = preprocess
        .getTopNOpeningsWithResults(data, this.options.numOpenings)
        .slice(0, this.options.numOpenings)
      title = 'Répartition des états de la victoire'
    }

    if (processedData.length === 0) {
      this.showNoDataMessage()
      return
    }

    this.setTitle(title)

    const names = processedData.map((d) => d.name)

    const useHorizontal = this.options.isHorizontal || names.length > 15
    this.useHorizontal = useHorizontal

    let xScale, yScale
    if (useHorizontal) {
      xScale = d3
        .scaleLinear()
        .domain([0, 100])
        .range([0, this.graphSize.width])

      yScale = d3
        .scaleBand()
        .domain(names)
        .range([0, this.graphSize.height])
        .padding(0.25)

      this.createXAxis(xScale, 'Pourcentage (%)')
      this.createYAxis(yScale, '')
    } else {
      xScale = d3
        .scaleBand()
        .domain(names)
        .range([0, this.graphSize.width])
        .padding(0.4)

      yScale = d3
        .scaleLinear()
        .domain([100, 0])
        .range([0, this.graphSize.height])

      this.createXAxis(xScale, '')
      this.createYAxis(yScale, 'Pourcentage (%)')
    }

    if (this.chartType === 'wins') {
      this.drawWinsByColorChart(processedData, xScale, yScale)
    } else {
      this.drawVictoryStatusChart(processedData, xScale, yScale)
    }

    this.createLegend()
  }

  /**
   * Draw the wins by color chart
   *
   * @param {Array} data - Processed data for wins by color
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   */
  drawWinsByColorChart (data, xScale, yScale) {
    const colorScale = d3
      .scaleOrdinal()
      .domain(['whiteWinPct', 'drawPct', 'blackWinPct'])
      .range(['#f0f0f0', '#808080', '#000000'])

    const stack = d3
      .stack()
      .keys(['whiteWinPct', 'drawPct', 'blackWinPct'])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone)

    const series = stack(data)

    this.chartGroup
      .selectAll('.series')
      .data(series)
      .enter()
      .append('g')
      .attr('class', (d) => `series series-${d.key}`)
      .attr('fill', (d) => colorScale(d.key))
      .selectAll('rect')
      .data((d) => d)
      .enter()
      .append('rect')
      .attr('y', (d) => yScale(d.data.name))
      .attr('x', (d) => xScale(d[0]))
      .attr('width', (d) => xScale(d[1]) - xScale(d[0]))
      .attr('height', yScale.bandwidth())
      .on('mouseover', (event, d) => {
        d3.select(event.target).attr('stroke', '#333').attr('stroke-width', 2)

        const value = d[1] - d[0]
        const key = d3.select(event.target.parentNode).datum().key
        const label =
          key === 'whiteWinPct'
            ? 'Victoires blancs'
            : key === 'blackWinPct'
              ? 'Victoires noirs'
              : 'Égalités'

        this.showTooltip(
          event,
          `
          <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${
            d.data.name
          }</div>
          <div style="margin-bottom: 8px; font-size: 11px; color: #777;">${label}</div>
          <div style="font-size: 14px; font-weight: bold;">${value.toFixed(
            2
          )}%</div>
        `
        )
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event)
      })
      .on('mouseout', (event) => {
        d3.select(event.target).attr('stroke', null).attr('stroke-width', null)

        this.hideTooltip()
      })

    this.legendData = [
      {
        key: 'whiteWinPct',
        label: 'Victoire des blancs %',
        color: colorScale('whiteWinPct')
      },
      { key: 'drawPct', label: 'Égalité %', color: colorScale('drawPct') },
      {
        key: 'blackWinPct',
        label: 'Victoire des noirs %',
        color: colorScale('blackWinPct')
      }
    ]
  }

  /**
   * Draw the victory status chart
   *
   * @param {Array} data - Processed data for victory status
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   */
  drawVictoryStatusChart (data, xScale, yScale) {
    const colorScale = d3
      .scaleOrdinal()
      .domain(['matePct', 'resignPct', 'outoftimePct', 'drawPct'])
      .range(d3.schemeTableau10)

    const stack = d3
      .stack()
      .keys(['matePct', 'resignPct', 'outoftimePct', 'drawPct'])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone)

    const series = stack(data)

    this.chartGroup
      .selectAll('.series')
      .data(series)
      .enter()
      .append('g')
      .attr('class', (d) => `series series-${d.key}`)
      .attr('fill', (d) => colorScale(d.key))
      .selectAll('rect')
      .data((d) => d)
      .enter()
      .append('rect')
      .attr('y', (d) => yScale(d.data.name))
      .attr('x', (d) => xScale(d[0]))
      .attr('width', (d) => xScale(d[1]) - xScale(d[0]))
      .attr('height', yScale.bandwidth())
      .on('mouseover', (event, d) => {
        d3.select(event.target).attr('stroke', '#333').attr('stroke-width', 2)

        const value = d[1] - d[0]
        const key = d3.select(event.target.parentNode).datum().key
        const label =
          key === 'matePct'
            ? 'Échec et mat'
            : key === 'resignPct'
              ? 'Abandon'
              : key === 'outoftimePct'
                ? 'Manque de temps'
                : 'Égalité'

        this.showTooltip(
          event,
          `
          <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${
            d.data.name
          }</div>
          <div style="margin-bottom: 8px; font-size: 11px; color: #777;">${label}</div>
          <div style="font-size: 14px; font-weight: bold;">${value.toFixed(
            2
          )}%</div>
        `
        )
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event)
      })
      .on('mouseout', (event) => {
        d3.select(event.target).attr('stroke', null).attr('stroke-width', null)

        this.hideTooltip()
      })

    this.legendData = [
      { key: 'matePct', label: 'Échec et mat %', color: colorScale('matePct') },
      { key: 'resignPct', label: 'Abandon %', color: colorScale('resignPct') },
      {
        key: 'outoftimePct',
        label: 'Manque de temps %',
        color: colorScale('outoftimePct')
      },
      { key: 'drawPct', label: 'Égalité %', color: colorScale('drawPct') }
    ]
  }

  /**
   * Create legend for the chart
   */
  createLegend () {
    const legendId = `${this.containerId}-legend`
    let legend = d3.select(`#${legendId}`)

    if (legend.empty()) {
      const container = d3.select(`#${this.containerId}`).node().parentNode

      legend = d3
        .select(container)
        .append('div')
        .attr('id', legendId)
        .attr('class', 'chart-legend')
        .style('display', 'flex')
        .style('flex-wrap', 'wrap')
        .style('justify-content', 'center')
        .style('margin-top', '10px')
        .style('padding', '8px')
        .style('border-radius', '5px')
        .style('background', 'rgba(255,255,255,0.9)')
    } else {
      legend.html('')
    }

    this.legendData.forEach((item) => {
      const legendItem = legend
        .append('div')
        .attr('class', 'legend-item')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('margin', '0 15px 5px 0')

      legendItem
        .append('div')
        .attr('class', 'legend-color')
        .style('background', item.color)
        .style('width', '15px')
        .style('height', '15px')
        .style('margin-right', '5px')
        .style('border-radius', '3px')

      legendItem.append('span').style('font-size', '12px').text(item.label)
    })
  }

  /**
   * Show message when no data is available or usable
   *
   * @param {string} [message] - Optional custom message
   */
  showNoDataMessage (
    message = 'Aucune donnée disponible pour les filtres sélectionnés'
  ) {
    if (!this.graphGroup) {
      console.error('Graph group not initialized for no data message.')
      return
    }
    this.graphGroup.selectAll('*').remove()
    this.graphGroup
      .append('text')
      .attr('class', 'no-data-message')
      .attr('x', this.graphSize.width / 2)
      .attr('y', this.graphSize.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '16px')
      .style('fill', '#666')
      .text(message)
  }
}

/**
 * Create and draw both stacked bar visualizations side by side
 *
 * @param {Array} data - Chess games dataset
 * @param {object} svgSize - Size of the SVG
 * @param {object} margin - Margins around the graph
 * @param {object} graphSize - Size of the graph
 */
export function drawViz (data, svgSize, margin, graphSize) {
  const extendedSvgSize = {
    width: svgSize.width,
    height: Math.max(
      svgSize.height,
      Math.min(
        10 * 15 + margin.top + margin.bottom,
        data.length * 10 + margin.top + margin.bottom
      )
    )
  }

  const winsViz = new StackedBarVisualization(
    'viz2-wins',
    {
      width: extendedSvgSize.width,
      height: extendedSvgSize.height,
      margin,
      isHorizontal: true
    },
    'wins'
  )
  winsViz.draw(data)

  const victoryViz = new StackedBarVisualization(
    'viz2-victory',
    {
      width: extendedSvgSize.width,
      height: extendedSvgSize.height,
      margin,
      isHorizontal: true
    },
    'victory'
  )
  victoryViz.draw(data)
}
