import * as preprocess from '../preprocess.js';
import { VisualizationBase } from '../visualization-base.js';

/**
 * Heatmap visualization for chess opening distribution by Elo rating
 * @extends VisualizationBase
 */
export class HeatmapVisualization extends VisualizationBase {
  /**
   * Create a new heatmap visualization
   * @param {string} containerId - ID of the container element
   * @param {Object} options - Visualization options
   */
  constructor(containerId, options = {}) {
    // Call parent constructor
    super(containerId, options);
    
    // Heatmap specific options
    this.options = {
      ...this.options,
      colorScheme: d3.interpolateYlOrRd,
      itemsPerPage: 10,
      ...options
    };
    
    // Filter state
    this.filterState = {
      rated: null,
      timeControl: null,
      color: 'both',
      sortBy: 'popularity'
    };

    this.uniqueId = options.uniqueId || 'default';
    this.currentPage = 0;
    this.itemsPerPage = this.options.itemsPerPage || 10;
    this.fullData = [];
  }
  
  /**
   * Draw the heatmap visualization
   * @param {Array} data - Chess games dataset
   */
  draw(data) {
    // Initialize SVG
    this.initialize();
    
    // Preprocess data for heatmap
    const filteredData = preprocess.getOpeningUsageByElo(
      data,
      this.filterState.rated,
      this.filterState.timeControl,
      this.filterState.color,
      this.filterState.sortBy
    );
    
    // Check if we have data
    if (!filteredData.data || filteredData.data.length === 0) {
      this.showNoDataMessage();
      return;
    }

    // Pagination
    this.fullData = filteredData;
    this.currentPage = 0;
    this.updatePaginatedData();
    this.createPaginationControls();
  }
  
  /**
   * Draw the heatmap from processed data
   * @param {Object} filteredData - Processed data for the heatmap
   */
  drawHeatmap(filteredData) {
    const heatmapData = filteredData.data;
    const openings = filteredData.openings;
    const eloRanges = filteredData.eloRanges.sort((a, b) => {
      const aStart = parseInt(a.split('-')[0]);
      const bStart = parseInt(b.split('-')[0]);
      return aStart - bStart;
    });
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(eloRanges)
      .range([0, this.graphSize.width])
      .padding(0.05);
    
    const yScale = d3.scaleBand()
      .domain(openings)
      .range([0, this.graphSize.height])
      .padding(0.05);
    
    const colorScale = d3.scaleSequential()
      .interpolator(this.options.colorScheme)
      .domain([0, 100]);
    
    // Create axes
    this.createXAxis(xScale, 'Plage Elo')
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');
    
    this.createYAxis(yScale, 'Ouverture');
  
    // Create heatmap cells
    this.graphGroup.selectAll('rect')
      .data(heatmapData)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.eloRange))
      .attr('y', d => yScale(d.opening))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .style('fill', d => d.relativeCount === 0 ? '#f5f5f5' : colorScale(d.relativeCount))
      .style('stroke', '#e0e0e0')
      .style('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.target)
          .style('stroke', '#333')
          .style('stroke-width', 2);
        
        // Show tooltip
        this.showTooltip(event, this.createTooltipContent(d));
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event);
      })
      .on('mouseout', (event) => {
        d3.select(event.target)
          .style('stroke', '#e0e0e0')
          .style('stroke-width', 1);
        
        this.hideTooltip();
      });
    
    // Create color legend
    this.createColorLegend(colorScale, 100);
  }
  
  /**
   * Create tooltip content
   * @param {Object} d - Data point
   * @returns {string} - HTML content for tooltip
   */
  createTooltipContent(d) {
    const formatPercent = d3.format('.1f');
    const totalWhiteBlack = d.whiteCount + d.blackCount;
    const whitePercent = totalWhiteBlack > 0 ? formatPercent(d.whiteCount / totalWhiteBlack * 100) : 0;
    const blackPercent = totalWhiteBlack > 0 ? formatPercent(d.blackCount / totalWhiteBlack * 100) : 0;
    const rel = d.relativeCount.toFixed(2);
    
    return `
      <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${d.opening}</div>
      <div style="margin-bottom: 8px; font-size: 11px; color: #777;">Plage Elo: ${d.eloRange}</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee;">Parties totales:</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${d.count}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee;">% des parties:</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${rel}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee;">Parties blancs:</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right;">${d.whiteCount} (${whitePercent}%)</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Parties noirs:</td>
          <td style="padding: 4px 0; text-align: right;">${d.blackCount} (${blackPercent}%)</td>
        </tr>
      </table>
    `;
  }
  
  /**
   * Create color legend for the heatmap
   * @param {Function} colorScale - D3 color scale
   * @param {number} maxCount - Maximum value for the scale
   */
  createColorLegend(colorScale, maxCount) {
    const legendWidth = 20;
    const legendHeight = this.graphSize.height / 2;
    
    const legend = this.graphGroup.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.graphSize.width + 20}, ${this.graphSize.height / 4})`);
    
    // Create gradient
    const defs = this.svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');
    
    // Add gradient stops
    const numStops = 10;
    for (let i = 0; i < numStops; i++) {
      const offset = i / (numStops - 1);
      gradient.append('stop')
        .attr('offset', `${offset * 100}%`)
        .attr('stop-color', colorScale(offset * maxCount));
    }
    
    // Draw legend rectangle
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');
    
    // Create scale for legend
    const legendScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([legendHeight, 0]);
    
    // Add legend axis
    const legendAxis = d3.axisRight(legendScale)
      .ticks(5)
      .tickFormat(d3.format('d'));
    
    legend.append('g')
      .attr('transform', `translate(${legendWidth}, 0)`)
      .call(legendAxis);
    
    // Add legend title
    legend.append('text')
      .attr('transform', `translate(${legendWidth / 2}, ${legendHeight + 30})`)
      .style('text-anchor', 'middle')
      .text('Nombre de parties');
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

  updatePaginatedData() {
    const start = this.currentPage * this.itemsPerPage;
    const end = start + this.itemsPerPage;
  
    const pagedOpenings = this.fullData.openings.slice(start, end);
    const pagedData = this.fullData.data.filter(d =>
      pagedOpenings.includes(d.opening)
    );
  
    this.graphGroup.selectAll('*').remove();
    this.setTitle(`Top ${this.options.numOpenings} ouvertures par utilisation selon les plages Elo`);
  
    this.drawHeatmap({
      ...this.fullData,
      openings: pagedOpenings,
      data: pagedData
    });
  
    this.updatePageIndicator();
  
    const maxPage = Math.floor(this.fullData.openings.length / this.itemsPerPage);
    const prefix = this.uniqueId;
    d3.select(`#${prefix}-prev-page`).attr("disabled", this.currentPage === 0 ? true : null).classed("disabled", this.currentPage === 0);
    d3.select(`#${prefix}-next-page`).attr("disabled", this.currentPage >= maxPage ? true : null).classed("disabled", this.currentPage >= maxPage);
  }
  

  createPaginationControls() {
    const container = d3.select(`#${this.containerId}`);
    container.selectAll('.pagination-container').remove();
    const maxPage = Math.floor(this.fullData.openings.length / this.itemsPerPage);

    const totalOpenings = this.fullData.openings.length;
    if (totalOpenings <= this.itemsPerPage) {
      return;
    }
    const prefix = this.uniqueId;

    const navContainer = container.append("div")
      .attr("id", `${prefix}-viz1-pagination`)
      .attr("class", "pagination-container")
      .style("display", "flex");

    navContainer.append("button")
      .attr("id", `${prefix}-prev-page`)
      .attr("class", "primary-button")
      .attr("disabled", this.currentPage === 0 ? true : null)
      .classed("disabled", this.currentPage === 0)
      .text("← Précédent")
      .on("click", () => this.goToPreviousPage());

    navContainer.append("span")
      .attr("id", `${prefix}-page-indicator`)
      .style("margin", "0 12px")
      .style("align-self", "center");

    navContainer.append("button")
      .attr("id", `${prefix}-next-page`)
      .attr("class", "primary-button")
      .attr("disabled", this.currentPage >= maxPage ? true : null)
      .classed("disabled", this.currentPage >= maxPage)
      .text("Suivant →")
      .on("click", () => this.goToNextPage());
  
    this.updatePageIndicator();
  }

  goToNextPage() {
    const maxPage = Math.floor(this.fullData.openings.length / this.itemsPerPage);
    if (this.currentPage < maxPage) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }
  
  goToPreviousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }
  
  updatePageIndicator() {
    const totalPages = Math.ceil(this.fullData.openings.length / this.itemsPerPage);
    const currentPageDisplay = this.currentPage + 1;
    d3.select(`#${this.uniqueId}-page-indicator`).text(`Page ${currentPageDisplay} sur ${totalPages}`);
  }
  
  /**
   * Update the visualization with new data
   * @param {Array} data - Chess games dataset
   */
  update(data) {
    // Store data reference
    this.data = data;
    
    // Clear and redraw
    this.clear();
    this.initialize();
    this.draw(data);
  }
}

/**
 * Create and draw the heatmap visualization
 * @param {Array} data - Chess games dataset
 * @param {Object} svgSize - Size of the SVG
 * @param {Object} margin - Margins around the graph
 * @param {Object} graphSize - Size of the graph
 */
export function drawViz(data, svgSize, margin, graphSize) {
  const heatmap = new HeatmapVisualization('viz1', {
    width: svgSize.width,
    height: svgSize.height,
    margin: margin
  });
  
  heatmap.draw(data);
}

export function drawSixHeatmaps(data, svgSize, margin, graphSize) {
  const container = d3.select('#viz1-six-heatmaps');
  container.selectAll('*').remove();

  const configs = [
    { id: 'rated', label: 'Parties classées', filter: { rated: 'rated' } },
    { id: 'unrated', label: 'Parties non classées', filter: { rated: 'casual' } },
    { id: 'bullet', label: 'Cadence Bullet', filter: { timeControl: 'Bullet' } },
    { id: 'blitz', label: 'Cadence Blitz', filter: { timeControl: 'Blitz' } },
    { id: 'rapid', label: 'Cadence Rapide', filter: { timeControl: 'Rapide' } },
    { id: 'classical', label: 'Cadence Classique', filter: { timeControl: 'Classique' } },
  ];

  configs.forEach(config => {
    const block = container.append('div')
      .attr('class', 'heatmap-block');

    block.append('h4')
      .attr('class', 'chart-title')
      .text(config.label);

    const divId = `heatmap-${config.id}`;
    block.append('div').attr('id', divId);

    const heatmap = new HeatmapVisualization(divId, {
      width: svgSize.width,
      height: svgSize.height,
      margin: margin,
      uniqueId: `pagination-${config.id}`
    });

    if (config.filter.rated) {
      heatmap.filterState.rated = config.filter.rated;
    }
    if (config.filter.timeControl) {
      heatmap.filterState.timeControl = config.filter.timeControl;
    }

    heatmap.draw(data);
  });
}

