/**
 * Base class for all visualizations
 * Provides common functionality and consistent styling
 */
export class VisualizationBase {
  /**
   * Create a new visualization
   *
   * @param {string} containerId - ID of the container element
   * @param {object} options - Visualization options
   */
  constructor (containerId, options = {}) {
    this.containerId = containerId
    this.container = document.getElementById(containerId)
    this.options = {
      margin: { top: 40, right: 100, bottom: 100, left: 150 },
      width: 1000,
      height: 600,
      colorScheme: d3.schemeCategory10,
      ...options
    }

    // Calculate graph dimensions
    this.graphSize = {
      width: this.options.width - this.options.margin.left - this.options.margin.right,
      height: this.options.height - this.options.margin.top - this.options.margin.bottom
    }

    // Reference to the visualization's SVG
    this.svg = null
    this.graphGroup = null

    // Create tooltip
    this.tooltip = this.createTooltip()
  }

  /**
   * Initialize the visualization
   */
  initialize () {
    // Clear existing content
    this.clear()

    // Create SVG element
    this.svg = d3.select(`#${this.containerId}`)
      .append('svg')
      .attr('class', 'visualization')
      .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    // Create main group element with margin transform
    this.graphGroup = this.svg.append('g')
      .attr('class', 'graph-group')
      .attr('transform', `translate(${this.options.margin.left},${this.options.margin.top})`)
  }

  /**
   * Clear the visualization
   */
  clear () {
    if (this.container) {
      const svg = this.container.querySelector('svg')
      if (svg) svg.remove()
    }
  }

  /**
   * Create tooltip element
   *
   * @returns {Selection} - D3 selection of the tooltip
   */
  createTooltip () {
    // Remove any existing tooltip
    d3.select(`#${this.containerId}-tooltip`).remove()

    // Create new tooltip
    return d3.select('body')
      .append('div')
      .attr('id', `${this.containerId}-tooltip`)
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('pointer-events', 'none')
  }

  /**
   * Show tooltip with content
   *
   * @param {Event} event - Mouse event
   * @param {string|Function} content - Tooltip content or function to generate content
   */
  showTooltip (event, content) {
    const tooltipContent = typeof content === 'function' ? content() : content

    this.tooltip
      .html(tooltipContent)
      .style('opacity', 1)
      .style('left', `${event.pageX + 12}px`)
      .style('top', `${event.pageY - 12}px`)
  }

  /**
   * Hide tooltip
   */
  hideTooltip () {
    this.tooltip
      .style('opacity', 0)
  }

  /**
   * Update tooltip position
   *
   * @param {Event} event - Mouse event
   */
  moveTooltip (event) {
    this.tooltip
      .style('left', `${event.pageX + 12}px`)
      .style('top', `${event.pageY - 12}px`)
  }

  /**
   * Create X axis
   *
   * @param {Function} scale - D3 scale function
   * @param {string} label - Axis label
   * @returns {Selection} - D3 selection of the axis group
   */
  createXAxis (scale, label) {
    const axis = this.graphGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.graphSize.height})`)
      .call(d3.axisBottom(scale))

    // Add axis label
    if (label) {
      axis.append('text')
        .attr('class', 'axis-label')
        .attr('x', this.graphSize.width / 2)
        .attr('y', 40)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#000')
        .text(label)
    }

    return axis
  }

  /**
   * Create Y axis
   *
   * @param {Function} scale - D3 scale function
   * @param {string} label - Axis label
   * @returns {Selection} - D3 selection of the axis group
   */
  createYAxis (scale, label) {
    const axis = this.graphGroup.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(scale))

    // Add axis label
    if (label) {
      axis.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -this.graphSize.height / 2)
        .attr('y', -40)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#000')
        .text(label)
    }

    return axis
  }

  /**
   * Create a legend
   *
   * @param {Array} items - Legend items (name, color)
   * @param {object} position - Legend position {x, y}
   * @returns {Selection} - D3 selection of the legend group
   */
  createLegend (items, position = { x: 0, y: 0 }) {
    const legend = this.graphGroup.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${position.x},${position.y})`)

    const legendItems = legend.selectAll('.legend-item')
      .data(items)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0,${i * 20})`)

    // Add color squares
    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => d.color)

    // Add text labels
    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text(d => d.name)
      .style('font-size', '12px')

    return legend
  }

  /**
   * Add title to the visualization
   *
   * @param {string} title - Chart title
   */
  setTitle (title) {
    // Find the title element in the container
    const titleElement = document.querySelector(`#${this.containerId}-chart-title`)
    if (titleElement) {
      titleElement.textContent = title
    }
  }

  /**
   * Draw the visualization (to be implemented by subclasses)
   *
   * @param {Array} data - Data for the visualization
   */
  draw (data) {
    throw new Error('Method draw() must be implemented by subclasses')
  }

  /**
   * Update the visualization (to be implemented by subclasses)
   *
   * @param {Array} data - Data for the visualization
   */
  update (data) {
    // Default implementation is to clear and redraw
    this.clear()
    this.initialize()
    this.draw(data)
  }
}
