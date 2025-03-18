import * as preprocess from '../preprocess.js'
import * as d3 from 'd3'

export function drawViz (data, svgSize, margin, graphSize) {
  const openingStats = preprocess.getOpeningStats(data)
  console.log(openingStats)

  d3.select('#viz5-chart-title')
    .text("Taux de performance des ouvertures selon le nombre de coups durant l'ouverture")

  const svg = d3.select('#viz5')
    .append('svg')
    .attr('width', svgSize.width)
    .attr('height', svgSize.height)

  let xAttribute = 'averagePly'

  function updateChart () {
    const xScale = d3.scaleLinear()
      .domain([d3.min(openingStats, d => d[xAttribute]), d3.max(openingStats, d => d[xAttribute])])
      .range([margin.left, graphSize.width - margin.right])

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([graphSize.height - margin.bottom, margin.top])

    const xAxis = d3.axisBottom(xScale)
    const yAxis = d3.axisLeft(yScale)

    svg.selectAll('.x-axis').remove()
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${graphSize.height - margin.bottom})`)
      .call(xAxis)
      .append('text')
      .attr('x', graphSize.width / 2)
      .attr('y', 40)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .text(xAttribute === 'averagePly' ? "Nombre moyen de coups durant l'ouverture" : 'Nombre moyen de tours')

    svg.selectAll('.y-axis').remove()
    svg.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -graphSize.height / 2)
      .attr('y', -40)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .text('Pourcentage de victoire des blancs')

    let tooltip = d3.select('#viz5-tooltip')
    if (tooltip.empty()) {
      tooltip = d3.select('#viz5')
        .append('div')
        .attr('id', 'viz5-tooltip')
        .style('position', 'absolute')
        .style('background', 'white')
        .style('border', '1px solid black')
        .style('padding', '5px')
        .style('border-radius', '5px')
        .style('opacity', 0)
        .style('pointer-events', 'none')
    }

    svg.selectAll('.dot').remove()
    svg.selectAll('.dot')
      .data(openingStats)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d[xAttribute]))
      .attr('cy', d => yScale(d.whiteWinPct))
      .attr('r', 3)
      .attr('fill', xAttribute === 'averagePly' ? 'steelblue' : 'green')
      .attr('opacity', 0.7)
      .on('mouseover', (event, d) => {
        tooltip.transition().duration(200).style('opacity', 1)
        tooltip.html(
          `<strong>${d.name}</strong><br>` +
          `${xAttribute === 'averagePly' ? 'Nombre moyen de coups' : 'Nombre moyen de tours'}: ${d[xAttribute].toFixed(1)}<br>` +
          `Victoire Blancs: ${d.whiteWinPct.toFixed(1)}%<br>` +
          `Victoire Noirs: ${d.blackWinPct.toFixed(1)}%<br>` +
          `Égalité: ${d.drawPct.toFixed(1)}%`
        )
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 20) + 'px')
      })
      .on('mousemove', (event) => {
        tooltip.style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 20) + 'px')
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0)
      })
  }

  updateChart()

  d3.select('#viz5-toggle-x-axis')
    .on('click', () => {
      xAttribute = xAttribute === 'averagePly' ? 'averageTurns' : 'averagePly'
      updateChart()
      d3.select('#viz5-toggle-x-axis').text(xAttribute === 'averagePly' ? 'Afficher le nombre moyen de tours' : "Afficher le nombre moyen de coups durant l'ouverture")
      d3.select('#viz5-chart-title')
        .text(xAttribute === 'averagePly' ? "Taux de performance des ouvertures selon le nombre de coups durant l'ouverture" : 'Taux de performance des ouvertures selon le nombre de tours')
    })
}
