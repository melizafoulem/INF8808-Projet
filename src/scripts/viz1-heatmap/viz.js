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
    const defaultOptions = {
      width: 1000,
      height: 600,
      margin: { top: 40, right: 100, bottom: 100, left: 150 },
      colorScheme: d3.interpolateYlOrRd,
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    if (!mergedOptions.margin) {
      mergedOptions.margin = defaultOptions.margin;
    }
    
    super(containerId, mergedOptions);
    
    this.options = {
      ...this.options,
      colorScheme: mergedOptions.colorScheme,
      consistentOpenings: mergedOptions.consistentOpenings || null
    };
    
    this.margin = { ...mergedOptions.margin };
    
    this.filterState = {
      rated: null,
      timeControl: null,
      color: 'both',
      sortBy: 'popularity'
    };

    this.uniqueId = options.uniqueId || 'default';
    this.fullData = [];
  }
  
  /**
   * Initialize the visualization
   */
  initialize() {
    try {
      super.initialize();
      
      if (!this.margin) {
        this.margin = { top: 40, right: 100, bottom: 100, left: 150 };
      }
      
      if (!this.graphSize) {
        this.graphSize = {
          width: this.options.width - this.margin.left - this.margin.right,
          height: this.options.height - this.margin.top - this.margin.bottom
        };
      }
    } catch (error) {
      d3.select(`#${this.containerId}`)
        .append('div')
        .attr('class', 'error-message')
        .style('color', 'red')
        .style('padding', '10px')
        .text(`Erreur d'initialisation: ${error.message}`);
    }
  }
  
  /**
   * Draw the heatmap visualization
   * @param {Array} data - Chess games dataset
   */
  draw(data) {
    this.initialize();
    
    const filteredData = preprocess.getOpeningUsageByElo(
      data,
      this.filterState.rated,
      this.filterState.timeControl,
      this.filterState.color,
      this.filterState.sortBy
    );
    
    if (!filteredData.data || filteredData.data.length === 0) {
      this.showNoDataMessage();
      return;
    }

    this.fullData = filteredData;
    
    this.drawHeatmap(filteredData);
  }
  
  /**
   * Draw the heatmap from processed data
   * @param {Object} filteredData - Processed data for the heatmap
   */
  drawHeatmap(filteredData) {
    if (!this.margin) {
      this.margin = { top: 40, right: 60, bottom: 80, left: 150 };
    }
    
    const heatmapData = filteredData.data;
    
    // Use consistent openings if provided, otherwise use the ones from the filtered data
    const openings = this.options.consistentOpenings || filteredData.openings;
    
    const eloRanges = filteredData.eloRanges.sort((a, b) => {
      const aStart = parseInt(a.split('-')[0]);
      const bStart = parseInt(b.split('-')[0]);
      return aStart - bStart;
    });
    
    const cellHeight = Math.max(5, Math.min(12, this.graphSize.height / openings.length - 2));
    
    const xScale = d3.scaleBand()
      .domain(eloRanges)
      .range([0, this.graphSize.width])
      .padding(0.05);
    
    const yScale = d3.scaleBand()
      .domain(openings)
      .range([0, openings.length * (cellHeight + 2)])
      .padding(0.03);
    
    const newHeight = openings.length * (cellHeight + 2) + this.margin.top + this.margin.bottom;
    this.svg.attr('height', newHeight);
    this.graphSize.height = openings.length * (cellHeight + 2);
    this.graphGroup.attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
    
    const colorScale = d3.scaleSequential()
      .interpolator(this.options.colorScheme)
      .domain([0, 100]);
    
    const xAxis = this.createXAxis(xScale, 'Plage Elo');
    xAxis.selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .style('font-size', '8px');
    
    this.createYAxis(yScale, '')
      .selectAll('text')
      .style('font-size', '8px');

    // Create a map for quick lookup of data points
    const dataMap = {};
    heatmapData.forEach(d => {
      dataMap[`${d.opening}|${d.eloRange}`] = d;
    });

    // Create cells for all combinations of openings and Elo ranges
    const allCells = [];
    openings.forEach(opening => {
      eloRanges.forEach(eloRange => {
        const key = `${opening}|${eloRange}`;
        if (dataMap[key]) {
          allCells.push(dataMap[key]);
        } else {
          // Create empty cell for missing data
          allCells.push({
            opening: opening,
            eloRange: eloRange,
            count: 0,
            relativeCount: 0,
            whiteCount: 0,
            blackCount: 0
          });
        }
      });
    });

    this.graphGroup.selectAll('rect')
      .data(allCells)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.eloRange))
      .attr('y', d => yScale(d.opening))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .style('fill', d => d.relativeCount === 0 ? '#f5f5f5' : colorScale(d.relativeCount))
      .style('stroke', '#e0e0e0')
      .style('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.target)
          .style('stroke', '#333')
          .style('stroke-width', 2);
        
        this.showTooltip(event, this.createTooltipContent(d));
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event);
      })
      .on('mouseout', (event) => {
        d3.select(event.target)
          .style('stroke', '#e0e0e0')
          .style('stroke-width', 0.5);
        
        this.hideTooltip();
      });
    
    // Only show color legend in standalone mode, not when in multi-heatmap view
    if (!this.options.consistentOpenings) {
      this.createColorLegend(colorScale, 100);
    }
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
    const legendWidth = 15;
    const legendHeight = Math.min(this.graphSize.height / 3, 120);
    
    // Create a fixed position for the legend in the upper right corner
    const legend = this.graphGroup.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.graphSize.width + 10}, 10)`);
    
    const defs = this.svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', `heatmap-gradient-${this.uniqueId}`)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');
    
    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const offset = i / numStops;
      const value = offset * maxCount;
      gradient.append('stop')
        .attr('offset', `${offset * 100}%`)
        .attr('stop-color', colorScale(value))
        .attr('stop-opacity', 1);
    }
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', `url(#heatmap-gradient-${this.uniqueId})`);
    
    const legendScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([legendHeight, 0]);
    
    const legendAxis = d3.axisRight(legendScale)
      .ticks(3)
      .tickFormat(d3.format('d'));
    
    legend.append('g')
      .attr('transform', `translate(${legendWidth}, 0)`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '7px');
    
    legend.append('text')
      .attr('transform', `translate(${legendWidth / 2}, ${legendHeight + 15})`)
      .style('text-anchor', 'middle')
      .style('font-size', '7px')
      .text('% parties');
  }
  
  /**
   * Show message when no data is available
   */
  showNoDataMessage() {
    this.graphGroup.selectAll('*').remove();
    
    const container = d3.select(`#${this.containerId}`);
    const errorDiv = container.append('div')
      .attr('class', 'no-data-error')
      .style('background-color', '#ffeeee')
      .style('border', '1px solid #ffaaaa')
      .style('border-radius', '5px')
      .style('padding', '15px')
      .style('margin', '10px 0')
      .style('text-align', 'center');
    
    errorDiv.append('p')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('color', '#cc0000')
      .text('Aucune donnée disponible pour les filtres sélectionnés');
    
    const filterDetails = errorDiv.append('div')
      .style('font-size', '12px')
      .style('margin-top', '10px')
      .style('color', '#666');
    
    filterDetails.append('p')
      .html(`<b>Type de partie:</b> ${this.filterState.rated || 'Tous'}`);
    
    filterDetails.append('p')
      .html(`<b>Contrôle du temps:</b> ${this.filterState.timeControl || 'Tous'}`);
    
    filterDetails.append('p')
      .html(`<b>Couleur:</b> ${this.filterState.color}`);
  }
  
  /**
   * Update the visualization with new data
   * @param {Array} data - Chess games dataset
   */
  update(data) {
    this.clear();
    this.initialize();
    this.draw(data);
  }
  
  /**
   * Update visualization with new filter state
   * @param {Object} filterState - Filter settings
   */
  updateFilters(filterState) {
    this.filterState = { ...this.filterState, ...filterState };
  }
}

/**
 * Draw the heatmap visualization
 * @param {Array} data - Chess games dataset
 * @param {Object} svgSize - Size of the SVG
 * @param {Object} margin - Margins around the graph
 * @param {Object} graphSize - Size of the graph
 */
export function drawViz(data, svgSize, margin, graphSize) {
  const heatmap = new HeatmapVisualization('viz1', {
    svgSize,
    margin,
    graphSize
  });
  
  heatmap.draw(data);
  
  return heatmap;
}

/**
 * Draw six heatmaps for different game types and time controls
 * @param {Array} data - Chess games dataset
 * @param {Object} svgSize - Size of the SVG
 * @param {Object} margin - Margins around the graph
 * @param {Object} graphSize - Size of the graph
 */
export function drawSixHeatmaps(data, svgSize, margin, graphSize) {
  if (!svgSize) svgSize = { width: 1200, height: 750 };
  if (!margin) margin = { top: 40, right: 60, bottom: 80, left: 150 };
  if (!graphSize) graphSize = {
    width: svgSize.width - margin.left - margin.right,
    height: svgSize.height - margin.top - margin.bottom
  };
  
  const container = d3.select('#viz1-six-heatmaps');
  container.html('');
  
  if (!data || data.length === 0) {
    container.append('div')
      .attr('class', 'no-data-message')
      .style('text-align', 'center')
      .style('padding', '50px')
      .style('color', '#666')
      .text('Aucune donnée disponible pour les filtres sélectionnés');
    return;
  }
  
  // Process all data once to get consistent openings across all heatmaps
  const allOpeningsData = preprocess.getOpeningUsageByElo(data, null, null, 'both', 'popularity');
  const consistentOpenings = allOpeningsData.openings;
  
  const smallerSvgSize = {
    width: svgSize.width / 2.5,
    height: 400
  };
  
  const smallerMargin = {
    top: margin.top * 0.8,
    right: 60,
    bottom: 80,
    left: margin.left * 0.8
  };
  
  const smallerGraphSize = {
    width: (smallerSvgSize.width - smallerMargin.left - smallerMargin.right),
    height: (smallerSvgSize.height - smallerMargin.top - smallerMargin.bottom)
  };
  
  // Create main container with two rows
  container.style('display', 'flex')
    .style('flex-direction', 'column')
    .style('gap', '20px')
    .style('width', '100%');
  
  const timeControls = [...new Set(data.map(d => d.estimated_time_control))].filter(tc => tc && tc !== 'Unknown');
  
  if (timeControls.length === 0) {
    container.append('div')
      .attr('class', 'no-data-message')
      .style('text-align', 'center')
      .style('padding', '50px')
      .style('color', '#666')
      .text('Aucune donnée de contrôle de temps disponible');
    return;
  }
  
  const timeControlsToUse = timeControls.length >= 3 
    ? timeControls.slice(0, 3) 
    : ['Bullet', 'Blitz', 'Rapide'];
  
  // Calculate height needed based on number of openings
  const calculatedHeight = Math.max(smallerSvgSize.height, consistentOpenings.length * 15 + smallerMargin.top + smallerMargin.bottom);
  
  // Create two rows (rated and casual)
  [true, false].forEach((isRated, i) => {
    const rowContainer = container.append('div')
      .attr('class', `heatmap-row ${isRated ? 'rated' : 'casual'}`)
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('width', '100%')
      .style('margin-bottom', '30px');
    
    // Add row title
    rowContainer.append('h4')
      .style('text-align', 'center')
      .style('margin-bottom', '15px')
      .text(isRated ? 'Parties classées' : 'Parties non classées');
    
    // Create scrollable container for this row
    const scrollContainer = rowContainer.append('div')
      .attr('class', 'heatmap-scroll-container')
      .style('height', '460px')
      .style('overflow-y', 'auto')
      .style('border', '1px solid #eee')
      .style('border-radius', '4px')
      .style('padding', '0 10px');
    
    // Create horizontal flex container for the 3 heatmaps
    const heatmapsContainer = scrollContainer.append('div')
      .attr('class', 'heatmaps-container')
      .style('display', 'flex')
      .style('flex-direction', 'row')
      .style('gap', '20px')
      .style('padding-top', '10px')
      .style('min-height', `${calculatedHeight + 50}px`);
    
    timeControlsToUse.forEach((timeControl, j) => {
      const id = `viz1-heatmap-${isRated ? 'rated' : 'casual'}-${timeControl.toLowerCase().replace(/\s+/g, '-')}`;
      
      const cell = heatmapsContainer.append('div')
        .attr('class', 'heatmap-cell')
        .style('flex', '1')
        .attr('id', id);
      
      cell.append('h5')
        .attr('class', 'heatmap-title')
        .style('position', 'sticky')
        .style('top', '0')
        .style('background-color', 'white')
        .style('padding', '10px 0')
        .style('margin-top', '0')
        .style('z-index', '10')
        .text(`${timeControl}`);
      
      const heatmapOptions = {
        width: smallerSvgSize.width,
        height: calculatedHeight,
        margin: { ...smallerMargin },
        uniqueId: id,
        consistentOpenings: consistentOpenings
      };
      
      const heatmap = new HeatmapVisualization(id, heatmapOptions);
      
      heatmap.updateFilters({
        rated: isRated ? 'rated' : 'casual',
        timeControl: timeControl,
        color: 'both',
        sortBy: 'popularity'
      });
      
      try {
        heatmap.draw(data);
      } catch (error) {
        cell.append('div')
          .attr('class', 'error-message')
          .style('color', 'red')
          .style('padding', '10px')
          .style('font-size', '12px')
          .text(`Erreur: ${error.message}`);
      }
    });
    
    // Add color scale legend for each row
    const legendContainer = rowContainer.append('div')
      .style('position', 'relative')
      .style('height', '0');
    
    const legend = legendContainer.append('div')
      .attr('class', 'row-color-legend')
      .style('position', 'absolute')
      .style('top', '-455px')
      .style('right', '10px')
      .style('background-color', 'rgba(255, 255, 255, 0.8)')
      .style('padding', '5px')
      .style('border-radius', '3px')
      .style('border', '1px solid #ddd')
      .style('font-size', '10px')
      .style('z-index', '100');
    
    const colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateYlOrRd)
      .domain([0, 100]);
    
    legend.append('div')
      .style('display', 'flex')
      .style('flex-direction', 'row')
      .style('align-items', 'center')
      .style('gap', '5px')
      .html(`
        <div style="width: 10px; height: 80px; background: linear-gradient(to top, ${colorScale(0)}, ${colorScale(100)});"></div>
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 80px;">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
      `);
    
    // Add scroll sync control
    scrollContainer.on('scroll', function() {
      // Sync scrolling with the other row
      const otherRow = d3.select(`.heatmap-row.${isRated ? 'casual' : 'rated'} .heatmap-scroll-container`);
      if (!otherRow.empty()) {
        otherRow.node().scrollTop = this.scrollTop;
      }
    });
  });
}

