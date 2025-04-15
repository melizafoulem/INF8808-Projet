import * as preprocess from '../preprocess.js';
import { VisualizationBase } from '../visualization-base.js';

/**
 * Stacked Bar Chart visualization for chess opening outcomes
 * @extends VisualizationBase
 */
export class StackedBarVisualization extends VisualizationBase {
  /**
   * Create a new stacked bar visualization
   * @param {string} containerId - ID of the container element
   * @param {Object} options - Visualization options
   */
  constructor(containerId, options = {}) {
    // Call parent constructor
    super(containerId, options);
    
    // Stacked bar specific options
    this.options = {
      ...this.options,
      numOpenings: 10,
      ...options
    };
    
    // State for toggling between chart types
    this.isShowingVictory = false;
    
    // References to chart elements
    this.winsByColorGroup = null;
    this.victoryStatusGroup = null;
    this.winLegend = null;
    this.victoryLegend = null;

    // Data for pagination
    this.fullWinnerData = [];
    this.currentPage = 0;
    this.fullResultsData = [];
    this.currentVictoryPage = 0;
    this.itemsPerPage = this.options.numOpenings || 10;
  }
  
  /**
   * Initialize the visualization
   */
  initialize() {
    // Call parent initialize
    super.initialize();
    
    // Create groups for both chart types
    this.winsByColorGroup = this.graphGroup.append('g')
      .attr('class', 'wins-by-color-group');
      
    this.victoryStatusGroup = this.graphGroup.append('g')
      .attr('class', 'victory-status-group')
      .style('opacity', 0)
      .style('display', 'none');
  }
  
  /**
   * Draw the stacked bar visualization
   * @param {Array} data - Chess games dataset
   */
  draw(data) {
    // Initialize SVG
    this.initialize();
    
    // Preprocess data for both chart types
    const topOpeningWinners = preprocess.getTopNOpeningsWinners(data, this.options.numOpenings).sort((a, b) => b.whiteWinPct - a.whiteWinPct);
    const topOpeningResults = preprocess.getTopNOpeningsWithResults(data, this.options.numOpenings).sort((a, b) => b.matePct - a.matePct);

    // Set pagination data
    this.fullWinnerData = topOpeningWinners;
    this.currentPage = 0;
    this.fullResultsData = topOpeningResults
    this.currentVictoryPage = 0;
    
    // Set initial chart title
    this.setTitle("Répartition des victoires par ouverture");
    
    // Create scales and axes
    const currentPageData = this.getCurrentPageData();
    const { xScale, yScale: yScaleWins } = this.createScales(currentPageData);
    const yScaleVictory = d3.scaleBand()
      .domain(topOpeningResults.map(d => d.name))
      .range([0, this.graphSize.height])
      .padding(0.3);

    this.yScaleWins = yScaleWins;
    this.yScaleVictory = yScaleVictory;
    
    // Draw both chart types
    this.drawWinsByColorChart(topOpeningWinners, xScale, yScaleWins);
    this.updateVictoryPaginatedData();
    this.updatePaginatedData();
    
    // Setup toggle button
    this.setupToggleButton();
    
    // Create legends
    this.createLegends();

    // Create pagination
    this.createPagination();
    
    // Initially hide victory status chart
    this.victoryStatusGroup.style('opacity', 0);
  }
  
  /**
   * Create scales and axes for the charts
   * @param {Array} winnerData - Data for wins by color
   * @param {Array} victoryData - Data for victory status
   * @returns {Object} - Scales for the charts
   */
  createScales(winnerData) {
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, this.graphSize.width]);
  
    const names = winnerData.map(d => d.name)
  
    const yScale = d3.scaleBand()
      .domain(names)
      .range([0, this.graphSize.height])
      .padding(0.3);
  
    this.createXAxis(xScale, 'Pourcentage (%)');
    this.createYAxis(yScale, 'Ouverture');
  
    return { xScale, yScale };
  }
  
  /**
   * Draw the wins by color chart
   * @param {Array} data - Processed data for wins by color
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   */
  drawWinsByColorChart(data, xScale, yScale) {
    // Color scale for wins by color
    const colorScale = d3.scaleOrdinal()
      .domain(["whiteWinPct", "drawPct", "blackWinPct"])
      .range(["#D3D3D3", "#4287f5", "#2E2E2E"]);
    
    // Create stacked data
    const stack = d3.stack()
      .keys(["whiteWinPct", "drawPct", "blackWinPct"])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);
    
    const series = stack(data);
    
    // Draw stacked bars
    this.winsByColorGroup.selectAll('.series')
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
          .attr('stroke-width', 2);
        
        // Show tooltip
        const value = d[1] - d[0];
        const key = d3.select(event.target.parentNode).datum().key;
        const label = key === 'whiteWinPct' ? 'Victoires blancs' :
                      key === 'blackWinPct' ? 'Victoires noirs' : 'Égalités';
        
        this.showTooltip(event, `
          <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${d.data.name}</div>
          <div style="margin-bottom: 8px; font-size: 11px; color: #777;">${label}</div>
          <div style="font-size: 14px; font-weight: bold;">${value.toFixed(2)}%</div>
        `);
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event);
      })
      .on('mouseout', (event) => {
        // Remove highlight
        d3.select(event.target)
          .attr('stroke', null)
          .attr('stroke-width', null);
        
        this.hideTooltip();
      });
    
    // Store legend data for later
    this.winLegendData = [
      { key: "whiteWinPct", label: "Victoire des blancs %", color: colorScale("whiteWinPct") },
      { key: "drawPct", label: "Égalité %", color: colorScale("drawPct") },
      { key: "blackWinPct", label: "Victoire des noirs %", color: colorScale("blackWinPct") }
    ];
  }
  
  /**
   * Draw the victory status chart
   * @param {Array} data - Processed data for victory status
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   */
  drawVictoryStatusChart(data, xScale, yScale) {
    // Color scale for victory status
    const colorScale = d3.scaleOrdinal()
      .domain(["matePct", "resignPct", "outoftimePct", "drawPct"])
      .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"]);
    
    // Create stacked data
    const stack = d3.stack()
      .keys(["matePct", "resignPct", "outoftimePct", "drawPct"])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);
    
    const series = stack(data);
    
    // Draw stacked bars
    this.victoryStatusGroup.selectAll('.series')
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
          .attr('stroke-width', 2);
        
        // Show tooltip
        const value = d[1] - d[0];
        const key = d3.select(event.target.parentNode).datum().key;
        const label = key === 'matePct' ? 'Échec et mat' :
                      key === 'resignPct' ? 'Abandon' :
                      key === 'outoftimePct' ? 'Manque de temps' : 'Égalité';
        
        this.showTooltip(event, `
          <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${d.data.name}</div>
          <div style="margin-bottom: 8px; font-size: 11px; color: #777;">${label}</div>
          <div style="font-size: 14px; font-weight: bold;">${value.toFixed(2)}%</div>
        `);
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event);
      })
      .on('mouseout', (event) => {
        // Remove highlight
        d3.select(event.target)
          .attr('stroke', null)
          .attr('stroke-width', null);
        
        this.hideTooltip();
      });
    
    // Store legend data for later
    this.victoryLegendData = [
      { key: "matePct", label: "Échec et mat %", color: colorScale("matePct") },
      { key: "resignPct", label: "Abandon %", color: colorScale("resignPct") },
      { key: "outoftimePct", label: "Manque de temps %", color: colorScale("outoftimePct") },
      { key: "drawPct", label: "Égalité %", color: colorScale("drawPct") }
    ];
  }
  
  /**
   * Create legends for both chart types
   */
  createLegends() {
    // Create container for legend
    const container = d3.select(`#${this.containerId}`);
    
    // Create win by color legend
    this.winLegend = container.select('#viz2-legend');
    this.updateLegend(this.winLegend, this.winLegendData);
    
    // Create victory status legend
    this.victoryLegend = container.select('#viz2-victory-legend');
    this.updateLegend(this.victoryLegend, this.victoryLegendData);
    
    // Initially hide victory legend
    this.victoryLegend.style('display', 'none').style('opacity', 0);
  }
  
  /**
   * Update a legend with data
   * @param {Selection} legend - D3 selection of the legend container
   * @param {Array} data - Legend data
   */
  updateLegend(legend, data) {
    // Clear existing legend
    legend.html("");
    
    // Add legend items
    data.forEach(item => {
      const legendItem = legend.append("div").attr("class", "legend-item");
      
      legendItem.append("div")
        .attr("class", "legend-color")
        .style("background", item.color);
      
      legendItem.append("span").text(item.label);
    });
  }
  
  /**
   * Setup toggle button for switching between chart types
   */
  setupToggleButton() {
    d3.select('#toggle-victory-chart').on('click', () => {
      this.toggleChartType();
    });
  }
  
  /**
   * Toggle between chart types
   */
  toggleChartType() {
    this.isShowingVictory = !this.isShowingVictory;
    
    if (this.isShowingVictory) {
      // Switch to victory status chart
      this.winsByColorGroup.transition().duration(500)
        .style('opacity', 0)
        .on('end', () => {
          this.winsByColorGroup.style('display', 'none');
        });
    
      this.winLegend.transition().duration(500)
        .style('opacity', 0)
        .on('end', () => {
          this.winLegend.style('display', 'none');
          this.victoryLegend.style('display', 'block')
            .transition().duration(500)
            .style('opacity', 1);
        });
    
      this.victoryStatusGroup.style('display', 'block')
        .transition().duration(500)
        .style('opacity', 1);
      
      this.setTitle("Répartition des états de la victoire");
      d3.select('#toggle-victory-chart')
        .text('Afficher la répartition des victoires');
      
      this.graphGroup.selectAll('.y-axis').remove();
      this.createYAxis(this.yScaleVictory, 'Ouverture');

      d3.select("#viz2-pagination").style("display", "none");
      d3.select("#viz2-victory-pagination").style("display", "flex");
    } else {
      // Switch to wins by color chart
      this.victoryStatusGroup.transition().duration(500)
        .style('opacity', 0)
        .on('end', () => {
          this.victoryStatusGroup.style('display', 'none');
        });
    
      this.victoryLegend.transition().duration(500)
        .style('opacity', 0)
        .on('end', () => {
          this.victoryLegend.style('display', 'none');
          this.winLegend.style('display', 'block')
            .transition().duration(500)
            .style('opacity', 1);
        });
    
      this.winsByColorGroup.style('display', 'block')
        .transition().duration(500)
        .style('opacity', 1);
    
      this.setTitle("Répartition des victoires par ouverture");
      d3.select('#toggle-victory-chart')
        .text('Afficher les statistiques de l\'état de la victoire');

      this.graphGroup.selectAll('.y-axis').remove();
      this.createYAxis(this.yScaleWins, 'Ouverture');

      d3.select("#viz2-pagination").style("display", "flex");
      d3.select("#viz2-victory-pagination").style("display", "none");
    }    
  }

  getCurrentPageData() {
    const start = this.currentPage * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.fullWinnerData.slice(start, end);
  }

  getCurrentVictoryPageData() {
    const start = this.currentVictoryPage * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.fullResultsData.slice(start, end);
  }

  updatePaginatedData() {
    const paginatedData = this.getCurrentPageData();

    this.graphGroup.selectAll('.y-axis').remove();
  
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, this.graphSize.width]);
  
    const { yScale } = this.createScales(paginatedData);
  
    this.yScaleWins = yScale;
  
    this.winsByColorGroup.selectAll('*').remove();
    this.drawWinsByColorChart(paginatedData, xScale, yScale);
    this.updatePageIndicator();

    d3.select("#viz2-prev-page").attr("disabled", this.currentPage === 0 ? true : null).classed("disabled", this.currentPage === 0);
    const maxPage = Math.floor(this.fullWinnerData.length / this.itemsPerPage);
    d3.select("#viz2-next-page").attr("disabled", this.currentPage >= maxPage ? true : null).classed("disabled", this.currentPage >= maxPage);
  }

  updateVictoryPaginatedData() {
    const paginatedData = this.getCurrentVictoryPageData();
  
    this.graphGroup.selectAll('.y-axis').remove();
  
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, this.graphSize.width]);
  
    const yScale = d3.scaleBand()
      .domain(paginatedData.map(d => d.name))
      .range([0, this.graphSize.height])
      .padding(0.3);
  
    this.yScaleVictory = yScale;
  
    this.victoryStatusGroup.selectAll('*').remove();
    this.drawVictoryStatusChart(paginatedData, xScale, yScale);
    this.createYAxis(this.yScaleVictory, 'Ouverture');
    this.updateVictoryPageIndicator();
  
    d3.select("#prev-victory-page").attr("disabled", this.currentVictoryPage === 0 ? true : null).classed("disabled", this.currentVictoryPage === 0);
    const maxPage = Math.floor(this.fullResultsData.length / this.itemsPerPage);
    d3.select("#next-victory-page").attr("disabled", this.currentVictoryPage >= maxPage ? true : null).classed("disabled", this.currentVictoryPage >= maxPage);
  }
  

  createPagination() {
    const container = d3.select(`#${this.containerId}`);
    const navContainer = container.append("div")
      .attr("id", "viz2-pagination")
      .attr("class", "pagination-container")
      .style("display", "flex");

    navContainer.append("button")
      .attr("id", "viz2-prev-page")
      .attr("class", "primary-button")
      .attr("disabled", this.currentPage === 0 ? true : null)
      .classed("disabled", this.currentPage === 0)
      .text("← Précédent")
      .on("click", () => this.goToPreviousPage());

    navContainer.append("span")
      .attr("id", "page-indicator")
      .style("margin", "0 12px")
      .style("align-self", "center");

    const maxPage = Math.floor(this.fullWinnerData.length / this.itemsPerPage);
    navContainer.append("button")
      .attr("id", "viz2-next-page")
      .attr("class", "primary-button")
      .attr("disabled", this.currentPage >= maxPage ? true : null)
      .classed("disabled", this.currentPage >= maxPage)
      .text("Suivant →")
      .on("click", () => this.goToNextPage());

    this.updatePageIndicator();

    const victoryNavContainer = container.append("div")
      .attr("id", "viz2-victory-pagination")
      .attr("class", "pagination-container")
      .style("display", "none");

    victoryNavContainer.append("button")
      .attr("id", "prev-victory-page")
      .attr("class", "primary-button")
      .attr("disabled", this.currentVictoryPage === 0 ? true : null)
      .classed("disabled", this.currentVictoryPage === 0)
      .text("← Précédent")
      .on("click", () => this.goToPreviousVictoryPage());

    victoryNavContainer.append("span")
      .attr("id", "victory-page-indicator")
      .style("margin", "0 12px")
      .style("align-self", "center");

    const maxPageVictory = Math.floor(this.fullResultsData.length / this.itemsPerPage);
    victoryNavContainer.append("button")
      .attr("id", "next-victory-page")
      .attr("class", "primary-button")
      .attr("disabled", this.currentPage >= maxPageVictory ? true : null)
      .classed("disabled", this.currentPage >= maxPageVictory)
      .text("Suivant →")
      .on("click", () => this.goToNextVictoryPage());

    this.updateVictoryPageIndicator();
  }

  updatePageIndicator() {
    const totalPages = Math.ceil(this.fullWinnerData.length / this.itemsPerPage);
    const currentPageDisplay = this.currentPage + 1;
    d3.select("#page-indicator").text(`Page ${currentPageDisplay} sur ${totalPages}`);
  }

  updateVictoryPageIndicator() {
    const totalPages = Math.ceil(this.fullResultsData.length / this.itemsPerPage);
    const currentPageDisplay = this.currentVictoryPage + 1;
    d3.select("#victory-page-indicator").text(`Page ${currentPageDisplay} sur ${totalPages}`);
  }  

  goToNextPage() {
    const maxPage = Math.floor(this.fullWinnerData.length / this.itemsPerPage);
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

  goToNextVictoryPage() {
    const maxPage = Math.floor(this.fullResultsData.length / this.itemsPerPage);
    if (this.currentVictoryPage < maxPage) {
      this.currentVictoryPage++;
      this.updateVictoryPaginatedData();
    }
  }
  
  goToPreviousVictoryPage() {
    if (this.currentVictoryPage > 0) {
      this.currentVictoryPage--;
      this.updateVictoryPaginatedData();
    }
  }
  
  
  /**
   * Update the visualization with new data
   * @param {Array} data - Chess games dataset
   */
  update(data) {
    // Clear and redraw
    this.clear();
    this.draw(data);
  }
}

/**
 * Create and draw the stacked bar visualization
 * @param {Array} data - Chess games dataset
 * @param {Object} svgSize - Size of the SVG
 * @param {Object} margin - Margins around the graph
 * @param {Object} graphSize - Size of the graph
 */
export function drawViz(data, svgSize, margin, graphSize) {
  const stackedBar = new StackedBarVisualization('viz2', {
    width: svgSize.width,
    height: svgSize.height,
    margin: margin
  });
  
  stackedBar.draw(data);
}
