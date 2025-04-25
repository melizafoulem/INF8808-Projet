import * as preprocess from '../preprocess.js'
import { VisualizationBase } from '../visualization-base.js'

/**
 * Line Chart visualization for opening performance across Elo ranges
 *
 * @augments VisualizationBase
 */
export class LineChartVisualization extends VisualizationBase {
  /**
   * Create a new line chart visualization
   *
   * @param {string} containerId - ID of the container element
   * @param {object} options - Visualization options including width, height, margin, etc.
   */
  constructor (containerId, options = {}) {
    super(containerId, options)

    this.options = {
      ...this.options,
      numOpenings: 10,
      colorScheme: d3.schemeTableau10,
      lineWidth: 2.5,
      pointRadius: 3,
      highlightedLineWidth: 4,
      highlightedPointRadius: 6,
      legendPadding: 20,
      legendItemHeight: 22,
      legendWidth: 180,
      xAxisTicks: 8,
      ...options
    }
  }

  /**
   * Draw the line chart visualization
   *
   * @param {Array} data - Chess games dataset
   */
  draw (data) {
    this.initialize()

    this.setTitle('Taux de performance des ouvertures')

    const openingsData = preprocess.getWinRateByOpeningAcrossEloRanges(
      data,
      this.options.numOpenings
    )

    if (
      !openingsData ||
      openingsData.length === 0 ||
      openingsData.every((d) => !d.openings || d.openings.length === 0)
    ) {
      this.showNoDataMessage()
      return
    }

    openingsData.forEach((d) => {
      d.openings = d.openings.slice(0, this.options.numOpenings)
    })

    const openings = this.extractOpenings(openingsData)
    const formattedData = this.formatDataForLineChart(openingsData, openings)

    if (formattedData.length === 0) {
      this.showNoDataMessage('Aucune donnée significative après filtrage.')
      return
    }

    const { xScale, yScale, colorScale } = this.createScales(
      openingsData,
      formattedData
    )

    this.drawGrid(xScale, yScale)
    this.drawReferenceLine(yScale)
    this.drawLines(formattedData, xScale, yScale, colorScale)
    this.drawPoints(formattedData, xScale, yScale, colorScale)
    this.createLineChartLegend(formattedData, colorScale)
  }

  /**
   * Extract unique openings from the initial processed data before formatting/filtering.
   * Ensures the color scale domain includes all potential openings even if some are filtered out later.
   *
   * @param {Array} data - Processed data from preprocess function
   * @returns {Array} - Array of unique opening names
   */
  extractOpenings (data) {
    return Array.from(
      new Set(data.flatMap((d) => d.openings?.map((o) => o.name) ?? []))
    )
  }

  /**
   * Format data for line chart. Filters out openings with insufficient data points.
   *
   * @param {Array} data - Processed data
   * @param {Array} uniqueOpeningNames - All unique opening names found
   * @returns {Array} - Formatted data for line chart, potentially fewer openings than uniqueOpeningNames
   */
  formatDataForLineChart (data, uniqueOpeningNames) {
    return uniqueOpeningNames
      .map((opening) => {
        const values = data
          .map((d) => {
            const found = Array.isArray(d.openings)
              ? d.openings.find((o) => o.name === opening)
              : undefined
            const eloValue = parseInt(d.range?.split('-')[0] ?? 0)

            const hasEnoughData =
              found &&
              typeof found.total === 'number' &&
              found.total >= 3 &&
              typeof found.whiteWinPct === 'number'

            return {
              range: d.range ?? 'N/A',
              eloValue: eloValue,
              whiteWinPct: hasEnoughData ? found.whiteWinPct : null,
              blackWinPct:
                found && typeof found.blackWinPct === 'number'
                  ? found.blackWinPct
                  : 0,
              drawPct:
                found && typeof found.drawPct === 'number' ? found.drawPct : 0,
              total: found && typeof found.total === 'number' ? found.total : 0,
              isValidPoint: hasEnoughData
            }
          })
          .sort((a, b) => a.eloValue - b.eloValue)

        return {
          name: opening,
          values: values
        }
      })
      .filter((openingData) => openingData.values.some((v) => v.isValidPoint))
  }

  /**
   * Draw grid lines for the chart
   *
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   */
  drawGrid (xScale, yScale) {
    this.graphGroup
      .selectAll('line.horizontal-grid')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'horizontal-grid')
      .attr('x1', 0)
      .attr('x2', this.graphSize.width)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1)
      .attr('shape-rendering', 'crispEdges')
  }

  /**
   * Create scales and axes for the line chart
   *
   * @param {Array} rawData - Raw preprocessed data (used for domain calculation)
   * @param {Array} formattedData - Formatted data (used for color scale domain)
   * @returns {object} - Scales for the line chart { xScale, yScale, colorScale }
   */
  createScales (rawData, formattedData) {
    const eloValues = rawData
      .flatMap((d) =>
        d.range
          ? [parseInt(d.range.split('-')[0]), parseInt(d.range.split('-')[1])]
          : []
      )
      .filter((v) => !isNaN(v))

    const minElo = eloValues.length > 0 ? d3.min(eloValues) : 0
    const maxElo = eloValues.length > 0 ? d3.max(eloValues) : 3000

    const xScale = d3
      .scaleLinear()
      .domain([minElo, maxElo])
      .range([0, this.graphSize.width])

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([this.graphSize.height, 0])

    const colorScale = d3
      .scaleOrdinal()
      .domain(formattedData.map((d) => d.name))
      .range(this.options.colorScheme)

    const xAxis = this.createXAxis(xScale, null, this.options.xAxisTicks)
    if (xAxis) {
      xAxis
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .style('font-size', '11px')
        .style('fill', '#555')

      xAxis
        .select('.domain')
        .style('stroke', '#888')
        .style('stroke-width', 1.5)
      xAxis
        .selectAll('.tick line')
        .style('stroke', '#888')
        .style('stroke-width', 1)
    }

    const yAxis = this.createYAxis(yScale, 'Pourcentage de victoire (%)', 5)
    if (yAxis) {
      yAxis
        .select('.domain')
        .style('stroke', '#888')
        .style('stroke-width', 1.5)
      yAxis
        .selectAll('.tick line')
        .style('stroke', '#888')
        .style('stroke-width', 1)

      yAxis
        .select('.y-axis-label')
        .style('font-size', '14px')
        .style('fill', '#555')
        .style('font-weight', 'bold')

      yAxis
        .selectAll('.tick text')
        .style('font-size', '12px')
        .style('fill', '#555')
    }

    return { xScale, yScale, colorScale }
  }

  /**
   * Draw reference line at 50% win rate
   *
   * @param {Function} yScale - Y scale
   */
  drawReferenceLine (yScale) {
    const y50 = yScale(50)

    this.graphGroup
      .append('rect')
      .attr('class', 'reference-line-bg')
      .attr('x', 0)
      .attr('y', yScale(51))
      .attr('width', this.graphSize.width)
      .attr('height', Math.abs(yScale(49) - yScale(51)))
      .attr('fill', '#f8f8f8')
      .attr('opacity', 0.5)

    this.graphGroup
      .append('line')
      .attr('class', 'reference-line')
      .attr('x1', 0)
      .attr('x2', this.graphSize.width)
      .attr('y1', y50)
      .attr('y2', y50)
      .attr('stroke', '#888')
      .attr('stroke-dasharray', '4 4')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.7)

    this.graphGroup
      .append('text')
      .attr('class', 'reference-line-label')
      .attr('x', this.graphSize.width - 5)
      .attr('y', y50 - 7)
      .attr('text-anchor', 'end')
      .style('font-size', '11px')
      .style('fill', '#666')
      .text('50%')
  }

  /**
   * Draw lines for each opening
   *
   * @param {Array} data - Formatted data
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   * @param {Function} colorScale - Color scale
   */
  drawLines (data, xScale, yScale, colorScale) {
    const line = d3
      .line()
      .defined((d) => d.isValidPoint)
      .x((d) => xScale(d.eloValue))
      .y((d) => yScale(d.whiteWinPct))
      .curve(d3.curveCatmullRom.alpha(0.5))

    const linesGroup = this.graphGroup.append('g').attr('class', 'lines-group')

    linesGroup
      .selectAll('.line-shadow')
      .data(data, (d) => d.name)
      .enter()
      .append('path')
      .attr(
        'class',
        (d) => `line-shadow shadow-${this.sanitizeClassName(d.name)}`
      )
      .attr('d', (d) => line(d.values))
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-width', this.options.lineWidth + 3)
      .attr('stroke-opacity', 0.08)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')

    linesGroup
      .selectAll('.line')
      .data(data, (d) => d.name)
      .enter()
      .append('path')
      .attr('class', (d) => `line line-${this.sanitizeClassName(d.name)}`)
      .attr('d', (d) => line(d.values))
      .attr('fill', 'none')
      .attr('stroke', (d) => colorScale(d.name))
      .attr('stroke-width', this.options.lineWidth)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        this.highlightLine(d)
      })
      .on('mouseout', () => {
        this.restoreLines()
      })
  }

  /**
   * Draw points for each valid data point
   *
   * @param {Array} data - Formatted data
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   * @param {Function} colorScale - Color scale
   */
  drawPoints (data, xScale, yScale, colorScale) {
    const pointsGroup = this.graphGroup
      .append('g')
      .attr('class', 'points-group')

    const pointData = data.flatMap((opening) =>
      opening.values
        .filter((d) => d.isValidPoint)
        .map((d) => ({ ...d, openingName: opening.name }))
    )

    pointsGroup
      .selectAll('.point-shadow')
      .data(pointData, (d) => `${d.openingName}-${d.eloValue}`)
      .enter()
      .append('circle')
      .attr(
        'class',
        (d) =>
          `point-shadow point-shadow-${this.sanitizeClassName(d.openingName)}`
      )
      .attr('cx', (d) => xScale(d.eloValue))
      .attr('cy', (d) => yScale(d.whiteWinPct))
      .attr('r', this.options.pointRadius + 1.5)
      .attr('fill', '#000')
      .attr('opacity', 0.1)
      .style('pointer-events', 'none')

    pointsGroup
      .selectAll('.point')
      .data(pointData, (d) => `${d.openingName}-${d.eloValue}`)
      .enter()
      .append('circle')
      .attr(
        'class',
        (d) => `point point-${this.sanitizeClassName(d.openingName)}`
      )
      .attr('cx', (d) => xScale(d.eloValue))
      .attr('cy', (d) => yScale(d.whiteWinPct))
      .attr('r', this.options.pointRadius)
      .attr('fill', (d) => colorScale(d.openingName))
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const opening = data.find((op) => op.name === d.openingName)
        if (!opening) return

        this.highlightLine(opening)

        const targetPoint = d3.select(event.currentTarget)
        targetPoint
          .attr('r', this.options.highlightedPointRadius)
          .attr('stroke-width', 2)
          .raise()

        d3.select(
          `.point-shadow-${this.sanitizeClassName(
            d.openingName
          )}[cx="${targetPoint.attr('cx')}"][cy="${targetPoint.attr('cy')}"]`
        )
          .attr('r', this.options.highlightedPointRadius + 1.5)
          .attr('opacity', 0.2)
          .raise()
        targetPoint.raise()

        this.showTooltip(event, this.createTooltipContent(opening, d))
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event)
      })
      .on('mouseout', (event, d) => {
        this.restoreLines()

        d3.select(event.currentTarget)
          .attr('r', this.options.pointRadius)
          .attr('stroke-width', 1)

        d3.selectAll('.point-shadow')
          .attr('r', this.options.pointRadius + 1.5)
          .attr('opacity', 0.1)

        d3.selectAll('.point')
          .filter((pt) => pt.openingName !== d.openingName)
          .attr('r', this.options.pointRadius)
          .attr('stroke-width', 1)

        this.hideTooltip()
      })
  }

  /**
   * Create tooltip content for a data point
   *
   * @param {object} opening - The opening object { name, values }
   * @param {object} dataPoint - The specific data point object from values array
   * @returns {string} - HTML content for tooltip
   */
  createTooltipContent (opening, dataPoint) {
    const openingColor =
      d3
        .select(`.line-${this.sanitizeClassName(opening.name)}`)
        .attr('stroke') || this.options.colorScheme[0]

    const textColor = '#333'
    const subTextColor = '#555'
    const subBgColor = '#f8f8f8'
    const borderColor = '#eee'

    const warningMsg =
      dataPoint.total < 10
        ? `<div style="background: rgba(255, 236, 179, 0.8); color: #b16e00; padding: 4px 8px; font-size: 11px; text-align: center; border-top: 1px solid ${borderColor}; border-bottom: 1px solid ${borderColor}; margin: 5px 0;"><span style="margin-right: 5px;">⚠️</span>Donnée peu significative (${dataPoint.total} parties)</div>`
        : ''

    const formatPct = (val) =>
      typeof val === 'number' ? val.toFixed(1) : 'N/A'
    const whitePct = formatPct(dataPoint.whiteWinPct)
    const drawPct = formatPct(dataPoint.drawPct)
    const blackPct = formatPct(dataPoint.blackWinPct)

    return `
      <div style="background: #fff; border-radius: 5px; box-shadow: 0 3px 12px rgba(0,0,0,0.2); overflow: hidden; width: 230px; font-family: sans-serif; line-height: 1.4;">
        <div style="background: ${openingColor}; color: ${textColor}; padding: 8px 12px; font-weight: bold; font-size: 14px; border-bottom: 1px solid rgba(0,0,0,0.1);">
          ${this.truncateName(opening.name, 30)} </div>
        ${warningMsg}
        <div style="padding: 10px 12px;">
          <div style="font-size: 13px; color: #555; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>Plage Elo:</span>
            <span style="font-weight: bold;">${dataPoint.range}</span>
          </div>

          <div style="background: ${subBgColor}; border-radius: 4px; padding: 8px; margin-bottom: 10px;">
            <div style="margin-bottom: 6px; font-size: 12px; color: ${subTextColor};">Résultats :</div>
            <div style="display: flex; height: 10px; width: 100%; border-radius: 3px; overflow: hidden; margin-bottom: 8px; border: 1px solid ${borderColor};">
              <div title="Blancs: ${whitePct}%" style="background: #4CAF50; width: ${
      dataPoint.whiteWinPct
    }%;"></div>
              <div title="Nuls: ${drawPct}%" style="background: #FFC107; width: ${
      dataPoint.drawPct
    }%;"></div>
              <div title="Noirs: ${blackPct}%" style="background: #F44336; width: ${
      dataPoint.blackWinPct
    }%;"></div>
            </div>
            <div style="display: flex; font-size: 11px; color: ${subTextColor}; justify-content: space-between;">
              <div><span style="color: #4CAF50;">■</span> ${whitePct}%</div>
              <div><span style="color: #FFC107;">■</span> ${drawPct}%</div>
              <div><span style="color: #F44336;">■</span> ${blackPct}%</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #555; border-top: 1px solid ${borderColor}; padding-top: 8px;">
            <span>Parties jouées:</span>
            <span style="font-weight: bold;">${dataPoint.total}</span>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Highlight a line and fade others
   *
   * @param {object} opening - Opening object { name, values } to highlight
   */
  highlightLine (opening) {
    const className = this.sanitizeClassName(opening.name)
    const highlightDuration = 150

    d3.selectAll('.line')
      .transition()
      .duration(highlightDuration)
      .attr('opacity', 0.15)
    d3.selectAll('.line-shadow')
      .transition()
      .duration(highlightDuration)
      .attr('opacity', 0.05)
    d3.selectAll('.point')
      .filter((d) => d.openingName !== opening.name)
      .transition()
      .duration(highlightDuration)
      .attr('opacity', 0.15)
    d3.selectAll('.point-shadow')
      .filter((d) => d.openingName !== opening.name)
      .transition()
      .duration(highlightDuration)
      .attr('opacity', 0.05)

    const lineSelection = d3.select(`.line-${className}`)
    lineSelection
      .interrupt()
      .transition()
      .duration(highlightDuration)
      .attr('opacity', 1)
      .attr('stroke-width', this.options.highlightedLineWidth)
    lineSelection.raise()

    const shadowSelection = d3.select(`.shadow-${className}`)
    shadowSelection
      .interrupt()
      .transition()
      .duration(highlightDuration)
      .attr('opacity', 0.25)
      .attr('stroke-width', this.options.highlightedLineWidth + 2)
    shadowSelection.raise()
    lineSelection.raise()

    const pointsSelection = d3.selectAll(`.point-${className}`)
    pointsSelection
      .interrupt()
      .transition()
      .duration(highlightDuration)
      .attr('opacity', 1)
    pointsSelection.raise()

    const pointShadowsSelection = d3.selectAll(`.point-shadow-${className}`)
    pointShadowsSelection
      .interrupt()
      .transition()
      .duration(highlightDuration)
      .attr('opacity', 0.15)
    pointShadowsSelection.raise()
    pointsSelection.raise()
  }

  /**
   * Restore all lines and points to normal appearance
   */
  restoreLines () {
    const restoreDuration = 200
    d3.selectAll('.line')
      .interrupt()
      .transition()
      .duration(restoreDuration)
      .attr('opacity', 1)
      .attr('stroke-width', this.options.lineWidth)

    d3.selectAll('.line-shadow')
      .interrupt()
      .transition()
      .duration(restoreDuration)
      .attr('opacity', 0.08)
      .attr('stroke-width', this.options.lineWidth + 3)

    d3.selectAll('.point')
      .interrupt()
      .transition()
      .duration(restoreDuration)
      .attr('opacity', 1)
      .attr('r', this.options.pointRadius)
      .attr('stroke-width', 1)

    d3.selectAll('.point-shadow')
      .interrupt()
      .transition()
      .duration(restoreDuration)
      .attr('opacity', 0.1)
      .attr('r', this.options.pointRadius + 1.5)
  }

  /**
   * Create legend for the line chart
   *
   * @param {Array} data - Formatted data (array of opening objects that are actually drawn)
   * @param {Function} colorScale - Color scale
   */
  createLineChartLegend (data, colorScale) {
    this.svg.select('.legend-group').remove()

    const legendPadding = this.options.legendPadding
    const itemHeight = this.options.legendItemHeight
    const legendMaxHeight = this.graphSize.height - 20
    const legendX = this.graphSize.width + legendPadding
    const legendY = 0

    const legendGroup = this.svg
      .append('g')
      .attr('class', 'legend-group')
      .attr(
        'transform',
        `translate(${this.options.margin.left + legendX}, ${
          this.options.margin.top + legendY
        })`
      )

    if (data.length * itemHeight > legendMaxHeight - 10) {
      const foreignObject = legendGroup.append('foreignObject')
        .attr('x', 0)
        .attr('y', 10)
        .attr('width', this.options.legendWidth - 10)
        .attr('height', legendMaxHeight - 20)

      const div = foreignObject
        .append('xhtml:div')
        .style('width', `${this.options.legendWidth - 20}px`)
        .style('height', `${legendMaxHeight - 20}px`)
        .style('overflow-y', 'auto')
        .style('overflow-x', 'hidden')
        .style('padding-right', '4px')

      data.forEach((d, i) => {
        const itemDiv = div.append('div')
          .attr('class', 'legend-item')
          .style('display', 'flex')
          .style('align-items', 'center')
          .style('height', `${itemHeight}px`)
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            this.highlightLine(d)
            itemDiv.select('span').style('font-weight', 'bold')
          })
          .on('mouseout', (event) => {
            this.restoreLines()
            itemDiv.select('span').style('font-weight', 'normal')
          })

        itemDiv.html(`
        <svg width="24" height="${itemHeight}" style="flex-shrink:0;">
          <line x1="0" y1="${itemHeight / 2}" x2="20" y2="${itemHeight / 2}" stroke="${colorScale(d.name)}" stroke-width="3" stroke-linecap="round"/>
          <circle cx="10" cy="${itemHeight / 2}" r="4" fill="${colorScale(d.name)}" stroke="white" stroke-width="1"/>
        </svg>
        <span style="font-size:12px; color:#333; margin-left:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:${this.options.legendWidth - 40}px;">${this.truncateName(d.name, 20)}</span>
      `)
      })
    } else {
      const legendItemsContainer = legendGroup
        .append('g')
        .attr('class', 'legend-items-container')
        .attr('transform', 'translate(0, 10)')

      const legendItems = legendItemsContainer
        .selectAll('.legend-item')
        .data(data, (d) => d.name)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * itemHeight})`)
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
          this.highlightLine(d)
          d3.select(event.currentTarget)
            .select('text')
            .style('font-weight', 'bold')
        })
        .on('mouseout', (event, d) => {
          this.restoreLines()
          d3.select(event.currentTarget)
            .select('text')
            .style('font-weight', 'normal')
        })

      legendItems
        .append('line')
        .attr('x1', 0)
        .attr('y1', itemHeight / 2)
        .attr('x2', 20)
        .attr('y2', itemHeight / 2)
        .attr('stroke', (d) => colorScale(d.name))
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')

      legendItems
        .append('circle')
        .attr('cx', 10)
        .attr('cy', itemHeight / 2)
        .attr('r', 4)
        .attr('fill', (d) => colorScale(d.name))
        .attr('stroke', 'white')
        .attr('stroke-width', 1)

      legendItems
        .append('text')
        .attr('x', 28)
        .attr('y', itemHeight / 2)
        .attr('dy', '0.35em')
        .text((d) => this.truncateName(d.name, 20))
        .style('font-size', '12px')
        .style('fill', '#333')
        .style('font-weight', 'normal')
    }
  }

  /**
   * Sanitize name for use in CSS class (simple version)
   *
   * @param {string} name - Input name
   * @returns {string} - Sanitized name
   */
  sanitizeClassName (name) {
    if (typeof name !== 'string') return 'invalid-name'

    return name
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  /**
   * Truncate name if too long
   *
   * @param {string} name - Input name
   * @param {number} maxLength - Maximum length before truncating
   * @returns {string} - Original or truncated name
   */
  truncateName (name, maxLength) {
    if (typeof name !== 'string') return ''
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength - 1) + '…'
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
 * Create and draw the line chart visualization.
 * Handles container sizing and instantiation.
 *
 * @param {Array} data - Chess games dataset
 * @param {object} [initialSvgSize] - Optional initial SVG size hint (can be overridden by container)
 * @param {object} [initialMargin] - Optional initial margins (can be overridden by container/options)
 * @param {object} [initialGraphSize] - Optional initial graph size (can be overridden by container)
 */
export function drawViz (
  data,
  initialSvgSize = { width: 800, height: 500 },
  initialMargin = { top: 60, right: 220, bottom: 80, left: 0 },
  initialGraphSize = null
) {
  const containerId = 'viz3'
  const container = document.getElementById(containerId + '-container')

  if (!container) {
    console.error(`Container element #${containerId}-container not found.`)
    return
  }

  const containerRect = container.getBoundingClientRect()
  const dynamicWidth =
    containerRect.width > 0 ? containerRect.width : initialSvgSize.width
  const dynamicHeight = 500
  const legendExtraWidth = 100

  const margin = {
    top: initialMargin.top,
    right: initialMargin.right,
    bottom: initialMargin.bottom,
    left: initialMargin.left
  }

  const graphSize = {
    width: dynamicWidth - margin.left - margin.right - legendExtraWidth,
    height: dynamicHeight - margin.top - margin.bottom
  }

  if (graphSize.width <= 0 || graphSize.height <= 0) {
    console.error(
      'Calculated graph dimensions are not positive. Check container size and margins.',
      { dynamicWidth, dynamicHeight, margin }
    )
    container.innerHTML =
      '<div style="color: red; padding: 20px;">Error: Cannot draw chart with calculated dimensions. Container might be too small or margins too large.</div>'
    return
  }

  const lineChart = new LineChartVisualization(containerId, {
    width: dynamicWidth,
    height: dynamicHeight,
    margin: margin
  })

  lineChart.graphSize = graphSize

  lineChart.draw(data)
}
