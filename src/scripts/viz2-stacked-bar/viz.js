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
    // Call parent constructor
    super(containerId, options)

    // Stacked bar specific options
    this.options = {
      ...this.options,
      numOpenings: 100, // Default number of openings to display
      ...options
    }

    // Ensure margin is properly initialized
    this.margin = this.options.margin || { top: 50, right: 50, bottom: 50, left: 80 }

    // Chart type (wins or victory)
    this.chartType = chartType

    // References to chart elements
    this.chartGroup = null
    this.legendData = null
  }

  /**
   * Initialize the visualization
   */
  initialize () {
    // Call parent initialize
    super.initialize()

    // Create group for the chart
    this.chartGroup = this.graphGroup.append('g')
      .attr('class', `${this.chartType}-chart-group`)
  }

  /**
   * Draw the stacked bar visualization
   *
   * @param {Array} data - Chess games dataset
   */
  draw (data) {
    // Initialize SVG
    this.initialize()

    // Preprocess data based on chart type
    let processedData, title
    if (this.chartType === 'wins') {
      processedData = preprocess.getTopNOpeningsWinners(data, this.options.numOpenings)
        .sort((a, b) => b.whiteWinPct - a.whiteWinPct)
      title = 'Répartition des victoires par ouverture'
    } else {
      processedData = preprocess.getTopNOpeningsWithResults(data, this.options.numOpenings)
        .sort((a, b) => b.matePct - a.matePct)
      title = 'Répartition des états de la victoire'
    }

    // Set title
    this.setTitle(title)

    // Create scales and axes
    const names = processedData.map(d => d.name)

    // Determine if we should use horizontal layout based on number of items
    const useHorizontal = this.options.isHorizontal || names.length > 15
    this.useHorizontal = useHorizontal

    let xScale, yScale
    if (useHorizontal) {
      // Horizontal layout - X and Y are flipped
      xScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, this.graphSize.width])

      yScale = d3.scaleBand()
        .domain(names)
        .range([0, this.graphSize.height])
        .padding(0.25) // Adjusted padding for optimal spacing

      this.createXAxis(xScale, 'Pourcentage (%)')
      this.createYAxis(yScale, '')
    } else {
      // Vertical layout - traditional bar chart
      xScale = d3.scaleBand()
        .domain(names)
        .range([0, this.graphSize.width])
        .padding(0.4) // Increased padding here as well

      yScale = d3.scaleLinear()
        .domain([100, 0]) // Reversed to start from top
        .range([0, this.graphSize.height])

      this.createXAxis(xScale, '')
      this.createYAxis(yScale, 'Pourcentage (%)')
    }

    // Draw the appropriate chart based on chartType
    if (this.chartType === 'wins') {
      this.drawWinsByColorChart(processedData, xScale, yScale)
    } else {
      this.drawVictoryStatusChart(processedData, xScale, yScale)
    }

    // Create legend
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
    // Color scale for wins by color
    const colorScale = d3.scaleOrdinal()
      .domain(['whiteWinPct', 'drawPct', 'blackWinPct'])
      .range(['#D3D3D3', '#4287f5', '#2E2E2E'])

    // Create stacked data
    const stack = d3.stack()
      .keys(['whiteWinPct', 'drawPct', 'blackWinPct'])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone)

    const series = stack(data)

    // Draw stacked bars
    this.chartGroup.selectAll('.series')
      .data(series)
      .enter()
      .append('g')
      .attr('class', d => `series series-${d.key}`)
      .attr('fill', d => colorScale(d.key))
      .selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('y', d => yScale(d.data.name))
      .attr('x', d => xScale(d[0]))
      .attr('width', d => xScale(d[1]) - xScale(d[0]))
      .attr('height', yScale.bandwidth())
      .on('mouseover', (event, d) => {
        // Highlight bar
        d3.select(event.target)
          .attr('stroke', '#333')
          .attr('stroke-width', 2)

        // Show tooltip
        const value = d[1] - d[0]
        const key = d3.select(event.target.parentNode).datum().key
        const label = key === 'whiteWinPct' ? 'Victoires blancs'
          : key === 'blackWinPct' ? 'Victoires noirs' : 'Égalités'

        this.showTooltip(event, `
          <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${d.data.name}</div>
          <div style="margin-bottom: 8px; font-size: 11px; color: #777;">${label}</div>
          <div style="font-size: 14px; font-weight: bold;">${value.toFixed(2)}%</div>
        `)
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event)
      })
      .on('mouseout', (event) => {
        // Remove highlight
        d3.select(event.target)
          .attr('stroke', null)
          .attr('stroke-width', null)

        this.hideTooltip()
      })

    // Store legend data
    this.legendData = [
      { key: 'whiteWinPct', label: 'Victoire des blancs %', color: colorScale('whiteWinPct') },
      { key: 'drawPct', label: 'Égalité %', color: colorScale('drawPct') },
      { key: 'blackWinPct', label: 'Victoire des noirs %', color: colorScale('blackWinPct') }
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
    // Color scale for victory status
    const colorScale = d3.scaleOrdinal()
      .domain(['matePct', 'resignPct', 'outoftimePct', 'drawPct'])
      .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'])

    // Create stacked data
    const stack = d3.stack()
      .keys(['matePct', 'resignPct', 'outoftimePct', 'drawPct'])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone)

    const series = stack(data)

    // Draw stacked bars
    this.chartGroup.selectAll('.series')
      .data(series)
      .enter()
      .append('g')
      .attr('class', d => `series series-${d.key}`)
      .attr('fill', d => colorScale(d.key))
      .selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('y', d => yScale(d.data.name))
      .attr('x', d => xScale(d[0]))
      .attr('width', d => xScale(d[1]) - xScale(d[0]))
      .attr('height', yScale.bandwidth())
      .on('mouseover', (event, d) => {
        // Highlight bar
        d3.select(event.target)
          .attr('stroke', '#333')
          .attr('stroke-width', 2)

        // Show tooltip
        const value = d[1] - d[0]
        const key = d3.select(event.target.parentNode).datum().key
        const label = key === 'matePct' ? 'Échec et mat'
          : key === 'resignPct' ? 'Abandon'
            : key === 'outoftimePct' ? 'Manque de temps' : 'Égalité'

        this.showTooltip(event, `
          <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${d.data.name}</div>
          <div style="margin-bottom: 8px; font-size: 11px; color: #777;">${label}</div>
          <div style="font-size: 14px; font-weight: bold;">${value.toFixed(2)}%</div>
        `)
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event)
      })
      .on('mouseout', (event) => {
        // Remove highlight
        d3.select(event.target)
          .attr('stroke', null)
          .attr('stroke-width', null)

        this.hideTooltip()
      })

    // Store legend data
    this.legendData = [
      { key: 'matePct', label: 'Échec et mat %', color: colorScale('matePct') },
      { key: 'resignPct', label: 'Abandon %', color: colorScale('resignPct') },
      { key: 'outoftimePct', label: 'Manque de temps %', color: colorScale('outoftimePct') },
      { key: 'drawPct', label: 'Égalité %', color: colorScale('drawPct') }
    ]
  }

  /**
   * Create legend for the chart
   */
  createLegend () {
    // Create or find the legend container
    const legendId = `${this.containerId}-legend`
    let legend = d3.select(`#${legendId}`)

    // If the legend container doesn't exist, create it
    if (legend.empty()) {
      // Find the container element
      const container = d3.select(`#${this.containerId}`).node().parentNode

      // Create a div for the legend
      legend = d3.select(container)
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
      // Clear existing legend
      legend.html('')
    }

    // Add legend items
    this.legendData.forEach(item => {
      const legendItem = legend.append('div')
        .attr('class', 'legend-item')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('margin', '0 15px 5px 0')

      legendItem.append('div')
        .attr('class', 'legend-color')
        .style('background', item.color)
        .style('width', '15px')
        .style('height', '15px')
        .style('margin-right', '5px')
        .style('border-radius', '3px')

      legendItem.append('span')
        .style('font-size', '12px')
        .text(item.label)
    })
  }

  /**
   * Update the visualization with new data
   *
   * @param {Array} data - Chess games dataset
   */
  update (data) {
    // Clear and redraw
    this.clear()
    this.draw(data)
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
  // Adjust SVG height to use more of the available space
  const extendedSvgSize = {
    width: svgSize.width,
    height: Math.max(svgSize.height, 150 * 15 + margin.top + margin.bottom)
  }

  // Chart 1: Wins by color
  const winsViz = new StackedBarVisualization('viz2-wins', {
    width: extendedSvgSize.width,
    height: extendedSvgSize.height,
    margin,
    isHorizontal: true
  }, 'wins')
  winsViz.draw(data)

  // Chart 2: Victory states
  const victoryViz = new StackedBarVisualization('viz2-victory', {
    width: extendedSvgSize.width,
    height: extendedSvgSize.height,
    margin,
    isHorizontal: true
  }, 'victory')
  victoryViz.draw(data)
}
