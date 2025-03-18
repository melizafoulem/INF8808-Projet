import * as preprocess from '../preprocess.js';
import * as helper from '../helper.js';

/**
 * Create and update the heatmap visualization
 * @param {Array} data - The dataset
 * @param {Object} svgSize - The dimensions of the SVG container
 * @param {Object} margin - The margins around the graph
 * @param {Object} graphSize - The dimensions of the graph
 */
export function drawViz(data, svgSize, margin, graphSize) {
  const numOpenings = 10;
  let filteredData = preprocess.getOpeningUsageByElo(data, numOpenings);
  
  const container = d3.select('#viz1');
  container.select('h4#viz1-chart-title')
    .text(`Top ${numOpenings} ouvertures par utilisation selon les plages Elo`);

  const vizContainer = container.append('div')
    .attr('class', 'viz1-container')
    .style('display', 'flex')
    .style('flex-direction', 'column')
    .style('align-items', 'center')
    .style('justify-content', 'center')
    .style('width', '100%');
  
  setupFilters(vizContainer, data, redrawHeatmap);
  
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("padding", "10px")
    .style("box-shadow", "0 4px 8px rgba(0,0,0,0.1)")
    .style("font-size", "12px")
    .style("max-width", "250px")
    .style("z-index", "10");
  
  drawHeatmap(vizContainer, filteredData, svgSize, margin, graphSize, tooltip);
  
  /**
   * Redraw the heatmap with new filter settings
   * @param {string} filterType - Filter for rated games (true/false/null)
   * @param {string} timeControl - Filter for time control
   * @param {string} colorFilter - Filter for player color
   * @param {string} sortBy - Sort openings by
   */
  function redrawHeatmap(filterType, timeControl, colorFilter, sortBy) {
    let ratedFilter = null;
    if (filterType === 'rated') {
      ratedFilter = true;
    } else if (filterType === 'casual') {
      ratedFilter = false;
    }
    
    let timeFilter = timeControl === 'all' ? null : timeControl;
    
    console.log('Redrawing with filters:', { 
      rated: ratedFilter, 
      timeControl: timeFilter, 
      color: colorFilter, 
      sortBy: sortBy 
    });
    
    filteredData = preprocess.getOpeningUsageByElo(data, numOpenings, ratedFilter, timeFilter, colorFilter, sortBy);
    
    let titleParts = [`Top ${numOpenings} ouvertures par utilisation selon les plages Elo`];
    if (filterType !== 'all') titleParts.push(`dans les parties ${filterType === 'rated' ? 'classées' : 'non classées'}`);
    if (timeControl !== 'all') titleParts.push(`avec contrôle de temps ${timeControl}`);
    if (colorFilter !== 'both') titleParts.push(`pour les joueurs ${colorFilter === 'white' ? 'blancs' : 'noirs'}`);
    
    container.select('h4#viz1-chart-title').text(titleParts.join(' '));
    
    vizContainer.select('#viz1-heatmap').remove();
    drawHeatmap(vizContainer, filteredData, svgSize, margin, graphSize, tooltip);
  }
}

/**
 * Setup filter controls for the heatmap
 * @param {Selection} container - The container for the visualization
 * @param {Array} data - The dataset
 * @param {Function} callback - Function to call when filters change
 */
function setupFilters(container, data, callback) {
  const filterContainer = container.append('div')
    .attr('class', 'filter-container')
    .style('margin-bottom', '20px')
    .style('display', 'flex')
    .style('flex-wrap', 'wrap')
    .style('gap', '20px')
    .style('justify-content', 'center');
  
  // Filter for rated/casual games
  const ratedFilter = filterContainer.append('div')
    .attr('class', 'filter');
  
  ratedFilter.append('label')
    .attr('for', 'rated-filter')
    .text('Type de partie: ');
  
  ratedFilter.append('select')
    .attr('id', 'rated-filter')
    .on('change', updateFilters)
    .selectAll('option')
    .data(['all', 'rated', 'casual'])
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => {
      if (d === 'all') return 'Toutes';
      if (d === 'rated') return 'Classées';
      if (d === 'casual') return 'Non classées';
    });
  
  // Filter for time control
  const timeControlFilter = filterContainer.append('div')
    .attr('class', 'filter');
  
  timeControlFilter.append('label')
    .attr('for', 'time-control-filter')
    .text('Contrôle du temps: ');
  
  const timeControls = ['all', ...preprocess.getTimeControlOptions(data)];
  
  timeControlFilter.append('select')
    .attr('id', 'time-control-filter')
    .on('change', updateFilters)
    .selectAll('option')
    .data(timeControls)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => d === 'all' ? 'Tous' : d);
  
  // Filter for player color
  const colorFilter = filterContainer.append('div')
    .attr('class', 'filter');
  
  colorFilter.append('label')
    .attr('for', 'color-filter')
    .text('Couleur du joueur: ');
  
  colorFilter.append('select')
    .attr('id', 'color-filter')
    .on('change', updateFilters)
    .selectAll('option')
    .data(['both', 'white', 'black'])
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => {
      if (d === 'both') return 'Les deux';
      if (d === 'white') return 'Blanc';
      if (d === 'black') return 'Noir';
    });
  
  // Sort by option
  const sortByFilter = filterContainer.append('div')
    .attr('class', 'filter');
  
  sortByFilter.append('label')
    .attr('for', 'sort-by-filter')
    .text('Trier par: ');
  
  sortByFilter.append('select')
    .attr('id', 'sort-by-filter')
    .on('change', updateFilters)
    .selectAll('option')
    .data(['popularity', 'name'])
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => {
      if (d === 'popularity') return 'Popularité';
      if (d === 'name') return 'Nom';
    });
  
  function updateFilters() {
    const rated = d3.select('#rated-filter').property('value');
    const timeControl = d3.select('#time-control-filter').property('value');
    const color = d3.select('#color-filter').property('value');
    const sortBy = d3.select('#sort-by-filter').property('value');
    
    callback(rated, timeControl, color, sortBy);
  }
}

/**
 * Draw the heatmap visualization
 * @param {Selection} container - The container for the visualization
 * @param {Object} filteredData - Preprocessed data for the heatmap
 * @param {Object} svgSize - The dimensions of the SVG container
 * @param {Object} margin - The margins around the graph
 * @param {Object} graphSize - The dimensions of the graph
 * @param {Selection} tooltip - The tooltip element
 */
function drawHeatmap(container, filteredData, svgSize, margin, graphSize, tooltip) {
  if (!filteredData.data || filteredData.data.length === 0 || !filteredData.openings || filteredData.openings.length === 0) {
    container.append('div')
      .attr('class', 'no-data-message')
      .style('text-align', 'center')
      .style('margin-top', '30px')
      .style('padding', '20px')
      .style('background-color', '#f8f8f8')
      .style('border-radius', '5px')
      .style('color', '#666')
      .style('font-size', '16px')
      .text('Aucune donnée disponible pour les filtres sélectionnés');
    return;
  }
  
  const svg = container.append('svg')
    .attr('id', 'viz1-heatmap')
    .attr('width', svgSize.width)
    .attr('height', svgSize.height)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  const heatmapData = filteredData.data;
  const openings = filteredData.openings;
  
  const eloRanges = filteredData.eloRanges.sort((a, b) => {
    const aStart = parseInt(a.split('-')[0]);
    const bStart = parseInt(b.split('-')[0]);
    return aStart - bStart;
  });
  
  const maxCount = d3.max(heatmapData, d => d.count);
  
  const xScale = d3.scaleBand()
    .domain(eloRanges)
    .range([0, graphSize.width])
    .padding(0.05);
  
  const yScale = d3.scaleBand()
    .domain(openings)
    .range([0, graphSize.height])
    .padding(0.05);
  
  const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateYlOrRd)
    .domain([0, maxCount]);
  
  const formatPercent = d3.format('.1f');
  
  svg.selectAll('rect')
    .data(heatmapData)
    .enter()
    .append('rect')
    .attr('x', d => xScale(d.eloRange))
    .attr('y', d => yScale(d.opening))
    .attr('width', xScale.bandwidth())
    .attr('height', yScale.bandwidth())
    .style('fill', d => d.count === 0 ? '#f5f5f5' : colorScale(d.count))
    .style('stroke', '#e0e0e0')
    .style('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      const totalWhiteBlack = d.whiteCount + d.blackCount;
      const whitePercent = totalWhiteBlack > 0 ? formatPercent(d.whiteCount / totalWhiteBlack * 100) : 0;
      const blackPercent = totalWhiteBlack > 0 ? formatPercent(d.blackCount / totalWhiteBlack * 100) : 0;
      
      d3.select(this)
        .style('stroke', '#333')
        .style('stroke-width', 2);
      
      tooltip.transition()
        .duration(200)
        .style('opacity', 0.9);
      
      tooltip.html(`
        <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${d.opening}</div>
        <div style="margin-bottom: 8px; font-size: 11px; color: #777;">Plage Elo: ${d.eloRange}</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; border-bottom: 1px solid #eee;">Parties totales:</td>
            <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${d.count}</td>
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
      `)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this)
        .style('stroke', '#e0e0e0')
        .style('stroke-width', 1);
      
      tooltip.transition()
        .duration(500)
        .style('opacity', 0);
    });
  
  const xAxis = d3.axisBottom(xScale);
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${graphSize.height})`)
    .call(xAxis)
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')
    .attr('dx', '-.8em')
    .attr('dy', '.15em');
  
  const yAxis = d3.axisLeft(yScale);
  svg.append('g')
    .attr('class', 'y-axis')
    .call(yAxis);
  
  svg.append('text')
    .attr('class', 'x-axis-title')
    .attr('x', graphSize.width / 2)
    .attr('y', graphSize.height + margin.bottom - 10)
    .style('text-anchor', 'middle')
    .text('Plage Elo');
  
  svg.append('text')
    .attr('class', 'y-axis-title')
    .attr('transform', 'rotate(-90)')
    .attr('x', -graphSize.height / 2)
    .attr('y', -margin.left + 20)
    .style('text-anchor', 'middle')
    .text('Ouverture');
  
  const legendWidth = 20;
  const legendHeight = graphSize.height / 2;
  
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${graphSize.width + 20}, ${graphSize.height / 4})`);
  
  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient')
    .attr('id', 'heatmap-gradient')
    .attr('x1', '0%')
    .attr('y1', '100%')
    .attr('x2', '0%')
    .attr('y2', '0%');
  
  const numStops = 10;
  for (let i = 0; i < numStops; i++) {
    const offset = i / (numStops - 1);
    gradient.append('stop')
      .attr('offset', `${offset * 100}%`)
      .attr('stop-color', colorScale(offset * maxCount));
  }
  
  legend.append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', 'url(#heatmap-gradient)');
  
  const legendScale = d3.scaleLinear()
    .domain([0, maxCount])
    .range([legendHeight, 0]);
  
  const legendAxis = d3.axisRight(legendScale)
    .ticks(5)
    .tickFormat(d3.format('d'));
  
  legend.append('g')
    .attr('transform', `translate(${legendWidth}, 0)`)
    .call(legendAxis);
  
  legend.append('text')
    .attr('transform', `translate(${legendWidth / 2}, ${legendHeight + 30})`)
    .style('text-anchor', 'middle')
    .text('Nombre de parties');
}
