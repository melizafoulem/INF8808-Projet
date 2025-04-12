import * as preprocess from '../preprocess.js';
import { VisualizationBase } from '../visualization-base.js';

/**
 * Line Chart visualization for opening performance across Elo ranges
 * @extends VisualizationBase
 */
export class LineChartVisualization extends VisualizationBase {
  /**
   * Create a new line chart visualization
   * @param {string} containerId - ID of the container element
   * @param {Object} options - Visualization options
   */
  constructor(containerId, options = {}) {
    // Call parent constructor
    super(containerId, options);
    
    // Line chart specific options
    this.options = {
      ...this.options,
      numOpenings: 5,
      colorScheme: d3.schemeCategory10,
      lineWidth: 2,
      pointRadius: 4,
      highlightedLineWidth: 4,
      highlightedPointRadius: 6,
      ...options
    };

    this.fullLineData = [];
    this.currentPage = 0;
    this.itemsPerPage = 5;
  }
  
  /**
   * Draw the line chart visualization
   * @param {Array} data - Chess games dataset
   */
  draw(data) {
    // Initialize SVG
    this.initialize();
    
    // Set chart title
    this.setTitle('Taux de performance des ouvertures');
    
    // Preprocess data for line chart
    const openingsData = preprocess.getWinRateByOpeningAcrossEloRanges(data, this.options.numOpenings);
    if (openingsData.length === 0) {
      this.showNoDataMessage();
      return;
    }
    
    // Extract openings and format data for line chart
    const openings = this.extractOpenings(openingsData);
    const formattedData = this.formatDataForLineChart(openingsData, openings);
    
    // Create scales
    const { xScale, yScale, colorScale } = this.createScales(openingsData, openings);
    
    // Draw reference line at 50%
    this.drawReferenceLine(yScale);
    
    // Draw lines
    this.drawLines(formattedData, xScale, yScale, colorScale);
    
    // Draw points
    this.drawPoints(formattedData, xScale, yScale, colorScale);

    // Pagination
    this.fullLineData = formattedData;
    this.currentPage = 0;
    this.updatePaginatedData(xScale, yScale, colorScale);
    this.createPaginationControls();
    this.xScale = xScale;
    this.yScale = yScale;
    this.colorScale = colorScale;
  }
  
  /**
   * Extract unique openings from the data
   * @param {Array} data - Processed data
   * @returns {Array} - Array of unique opening names
   */
  extractOpenings(data) {
    return Array.from(new Set(data.flatMap(d => d.openings.map(o => o.name))));
  }
  
  /**
   * Format data for line chart
   * @param {Array} data - Processed data
   * @param {Array} openings - List of opening names
   * @returns {Array} - Formatted data for line chart
   */
  formatDataForLineChart(data, openings) {
    return openings
      .map(opening => {
        const values = data.map(d => {
          const found = d.openings.find(o => o.name === opening);
          return {
            range: d.range,
            eloValue: parseInt(d.range.split('-')[0]),
            whiteWinPct: found && found.total >= 3 ? found.whiteWinPct : null,
            blackWinPct: found ? found.blackWinPct : 0,
            drawPct: found ? found.drawPct : 0,
            total: found ? found.total : 0
          };
        }).sort((a, b) => a.eloValue - b.eloValue);

        return {
          name: opening,
          values
        };
    }).filter(openingData => openingData.values.some(v => v.total >= 3));
  }
  
  /**
   * Create scales for the line chart
   * @param {Array} data - Processed data
   * @param {Array} openings - List of opening names
   * @returns {Object} - Scales for the line chart
   */
  createScales(data, openings) {
    // Extract Elo ranges for x-axis
    const eloRanges = data.map(d => {
      const range = d.range.split('-');
      return [parseInt(range[0]), parseInt(range[1])];
    });
    
    // Find min and max Elo values
    const minElo = d3.min(eloRanges, d => d[0]);
    const maxElo = d3.max(eloRanges, d => d[1]);
    
    // Create x scale (Elo rating)
    const xScale = d3.scaleLinear()
      .domain([minElo, maxElo])
      .range([0, this.graphSize.width]);
    
    // Create y scale (win percentage)
    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([this.graphSize.height, 0]);
    
    // Create color scale for openings
    const colorScale = d3.scaleOrdinal()
      .domain(openings)
      .range(this.options.colorScheme);
    
    // Create axes
    this.createXAxis(xScale, 'Classement Elo')
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');
    
    this.createYAxis(yScale, 'Pourcentage de victoire (%)');
    
    return { xScale, yScale, colorScale };
  }
  
  /**
   * Draw reference line at 50% win rate
   * @param {Function} yScale - Y scale
   */
  drawReferenceLine(yScale) {
    this.graphGroup.append('line')
      .attr('class', 'reference-line')
      .attr('x1', 0)
      .attr('x2', this.graphSize.width)
      .attr('y1', yScale(50))
      .attr('y2', yScale(50))
      .attr('stroke', 'gray')
      .attr('stroke-dasharray', '4 4')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5);
  }
  
  /**
   * Draw lines for each opening
   * @param {Array} data - Formatted data
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   * @param {Function} colorScale - Color scale
   */
  drawLines(data, xScale, yScale, colorScale) {
    // Create line generator
    const line = d3.line()
      .defined(d => d.whiteWinPct !== null)
      .x(d => xScale(d.eloValue))
      .y(d => yScale(d.whiteWinPct))
      .curve(d3.curveMonotoneX); // Smooth curve
    
    // Draw a line for each opening
    this.graphGroup.selectAll('.line')
      .data(data)
      .enter()
      .append('path')
      .attr('class', d => `line line-${this.sanitizeClassName(d.name)}`)
      .attr('d', d => line(d.values))
      .attr('fill', 'none')
      .attr('stroke', d => colorScale(d.name))
      .attr('stroke-width', this.options.lineWidth)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        // Highlight this line and fade others
        this.highlightLine(d);
      })
      .on('mouseout', () => {
        // Restore all lines
        this.restoreLines();
      });
  }
  
  /**
   * Draw points for each data point
   * @param {Array} data - Formatted data
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   * @param {Function} colorScale - Color scale
   */
  drawPoints(data, xScale, yScale, colorScale) {
    // For each opening
    data.forEach(opening => {
      const className = this.sanitizeClassName(opening.name);
      
      // Draw points
      this.graphGroup.selectAll(`.point-${className}`)
        .data(opening.values.filter(d => d.whiteWinPct !== null))
        .enter()
        .append('circle')
        .attr('class', `point point-${className}`)
        .attr('cx', d => xScale(d.eloValue))
        .attr('cy', d => yScale(d.whiteWinPct))
        .attr('r', this.options.pointRadius)
        .attr('fill', colorScale(opening.name))
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
          // Highlight this point and its line
          this.highlightLine(opening);
          d3.select(event.target)
            .attr('r', this.options.highlightedPointRadius)
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
          
          // Show tooltip
          this.showTooltip(event, this.createTooltipContent(opening, d));
        })
        .on('mousemove', (event) => {
          this.moveTooltip(event);
        })
        .on('mouseout', (event) => {
          // Restore all lines and this point
          this.restoreLines();
          d3.select(event.target)
            .attr('r', this.options.pointRadius)
            .attr('stroke', 'white')
            .attr('stroke-width', 1);
          
          this.hideTooltip();
        });
    });
  }
  
  /**
   * Create tooltip content for data point
   * @param {Object} opening - Opening data
   * @param {Object} dataPoint - Data point
   * @returns {string} - HTML content for tooltip
   */
  createTooltipContent(opening, dataPoint) {
    return `
      ${dataPoint.total < 10 ? '<div style="color:red; margin-bottom: 5px;">⚠ Donnée peu significative (peu de parties)</div>' : ''}
      <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${opening.name}</div>
      <div style="margin-bottom: 8px; font-size: 11px; color: #777;">${dataPoint.range}</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee;">Victoire Blancs:</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${dataPoint.whiteWinPct.toFixed(2)}%</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee;">Victoire Noirs:</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right;">${dataPoint.blackWinPct.toFixed(2)}%</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Égalité:</td>
          <td style="padding: 4px 0; text-align: right;">${dataPoint.drawPct.toFixed(2)}%</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; border-top: 1px solid #eee;">Total parties:</td>
          <td style="padding: 4px 0; border-top: 1px solid #eee; text-align: right;">${dataPoint.total}</td>
        </tr>
      </table>
    `;
  }
  
  /**
   * Highlight a line and fade others
   * @param {Object} opening - Opening to highlight
   */
  highlightLine(opening) {
    const className = this.sanitizeClassName(opening.name);
    
    // Fade all lines and points
    d3.selectAll('.line').attr('opacity', 0.2);
    d3.selectAll('.point').attr('opacity', 0.2);
    
    // Highlight selected line and points
    d3.select(`.line-${className}`)
      .attr('opacity', 1)
      .attr('stroke-width', this.options.highlightedLineWidth);
    
    d3.selectAll(`.point-${className}`)
      .attr('opacity', 1);
  }
  
  /**
   * Restore all lines and points to normal
   */
  restoreLines() {
    d3.selectAll('.line')
      .attr('opacity', 1)
      .attr('stroke-width', this.options.lineWidth);
    
    d3.selectAll('.point')
      .attr('opacity', 1);
  }
  
  /**
   * Create legend for the line chart
   * @param {Array} openings - List of opening names
   * @param {Function} colorScale - Color scale
   */
  createLineChartLegend(openings, colorScale) {
    const legendData = openings.map(name => ({
      name: name,
      color: colorScale(name)
    }));
    
    const legend = this.graphGroup.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.graphSize.width - 120}, 20)`);
    
    const legendItems = legend.selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        // Highlight the corresponding line
        this.highlightLine(d);
      })
      .on('mouseout', () => {
        // Restore all lines
        this.restoreLines();
      });
    
    // Add color rectangle
    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => d.color);
    
    // Add text label
    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text(d => this.truncateName(d.name, 15))
      .style('font-size', '12px');
  }
  
  /**
   * Sanitize opening name for use in CSS class
   * @param {string} name - Opening name
   * @returns {string} - Sanitized name
   */
  sanitizeClassName(name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '-');
  }
  
  /**
   * Truncate name if too long
   * @param {string} name - Opening name
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated name
   */
  truncateName(name, maxLength) {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Show message when no data is available
   */
  showNoDataMessage() {
    this.graphGroup.append('text')
      .attr('class', 'no-data-message')
      .attr('x', this.graphSize.width / 2)
      .attr('y', this.graphSize.height / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('fill', '#666')
      .text('Aucune donnée disponible pour les filtres sélectionnés');
  }

  getCurrentPageData() {
    const start = this.currentPage * this.itemsPerPage;
    return this.fullLineData.slice(start, start + this.itemsPerPage);
  }

  updatePaginatedData(xScale, yScale, colorScale) {
    this.graphGroup.selectAll('.line').remove();
    this.graphGroup.selectAll('.point').remove();
    this.graphGroup.selectAll('.legend').remove();
  
    const currentData = this.getCurrentPageData();
    this.drawLines(currentData, xScale, yScale, colorScale);
    this.drawPoints(currentData, xScale, yScale, colorScale);
    this.createLineChartLegend(currentData.map(d => d.name), colorScale);

    const maxPage = Math.floor(this.fullLineData.length / this.itemsPerPage);
    d3.select(`#viz3-prev-page`).attr("disabled", this.currentPage === 0 ? true : null).classed("disabled", this.currentPage === 0);
    d3.select(`#viz2-next-page`).attr("disabled", this.currentPage >= maxPage ? true : null).classed("disabled", this.currentPage >= maxPage);
  }

  createPaginationControls() {
    const container = d3.select(`#${this.containerId}`);
    const nav = container.append('div')
      .attr('id', 'viz3-pagination')
      .attr("class", "pagination-container")
      .style('display', 'flex')
      .style('gap', '12px')
      .style('margin-top', '20px');
  
    nav.append('button')
      .text('← Précédent')
      .attr('class', 'primary-button')
      .attr('id', 'viz3-prev-page')
      .attr("disabled", this.currentPage === 0 ? true : null)
      .classed("disabled", this.currentPage === 0)
      .on('click', () => {
        if (this.currentPage > 0) {
          this.currentPage--;
          this.updatePaginatedData(this.xScale, this.yScale, this.colorScale);
          this.updatePageIndicator();
        }
      });
  
    nav.append('span')
      .attr('id', 'page-indicator-viz3')
      .style('align-self', 'center');
  
    const maxPage = Math.floor(this.fullLineData.length / this.itemsPerPage);
    nav.append('button')
      .text('Suivant →')
      .attr('class', 'primary-button')
      .attr('id', 'viz2-next-page')
      .attr("disabled", this.currentPage >= maxPage ? true : null)
      .classed("disabled", this.currentPage >= maxPage)
      .on('click', () => {
        if (this.currentPage < maxPage) {
          this.currentPage++;
          this.updatePaginatedData(this.xScale, this.yScale, this.colorScale);
          this.updatePageIndicator();
        }
      });
  
    this.updatePageIndicator();
  }

  updatePageIndicator() {
    const totalPages = Math.ceil(this.fullLineData.length / this.itemsPerPage);
    const current = this.currentPage + 1;
    d3.select('#page-indicator-viz3').text(`Page ${current} sur ${totalPages}`);
  }  
  
  /**
   * Update the visualization with new data
   * @param {Array} data - Chess games dataset
   */
  update(data) {
    // Clear and redraw
    this.clear();
    this.initialize();
    this.draw(data);
  }
}

/**
 * Create and draw the line chart visualization
 * @param {Array} data - Chess games dataset
 * @param {Object} svgSize - Size of the SVG
 * @param {Object} margin - Margins around the graph
 * @param {Object} graphSize - Size of the graph
 */
export function drawViz(data, svgSize, margin, graphSize) {
  const lineChart = new LineChartVisualization('viz3', {
    width: svgSize.width,
    height: svgSize.height,
    margin: margin
  });
  
  lineChart.draw(data);
}
