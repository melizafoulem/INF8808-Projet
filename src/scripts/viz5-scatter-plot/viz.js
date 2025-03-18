import * as preprocess from '../preprocess.js'
import * as d3 from 'd3'

export function drawViz (data, svgSize, margin, graphSize) {
  const openingStats = preprocess.getOpeningStats(data)
  console.log(openingStats)

  d3.select('#viz5-chart-title')
    .text("Taux de performance des ouvertures selon le nombre de coup durant l'ouverture")

  const svg = d3.select('#viz5')
    .append('svg')
    .attr('width', svgSize.width)
    .attr('height', svgSize.height)

  const xScale = d3.scaleLinear()
    .domain([d3.min(openingStats, d => d.averagePly), d3.max(openingStats, d => d.averagePly)])
    .range([margin.left, graphSize.width - margin.right])

  const yScale = d3.scaleLinear()
    .domain([0, 100])
    .range([graphSize.height - margin.bottom, margin.top])

  const xAxis = d3.axisBottom(xScale)
  const yAxis = d3.axisLeft(yScale)

  svg.append('g')
    .attr('transform', `translate(0,${graphSize.height - margin.bottom})`)
    .call(xAxis)
    .append('text')
    .attr('x', graphSize.width / 2)
    .attr('y', 40)
    .attr('fill', 'black')
    .attr('text-anchor', 'middle')
    .text("Nombre moyen de tour durant l'ouverture")

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(yAxis)
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -graphSize.height / 2)
    .attr('y', -40)
    .attr('fill', 'black')
    .attr('text-anchor', 'middle')
    .text('Pourcentage de victoire des blancs')

  const tooltip = d3.select('#viz5')
    .append('div')
    .style('position', 'absolute')
    .style('background', 'white')
    .style('border', '1px solid black')
    .style('padding', '5px')
    .style('border-radius', '5px')
    .style('opacity', 0)
    .style('pointer-events', 'none')

  svg.selectAll('.dot')
    .data(openingStats)
    .enter().append('circle')
    .attr('cx', d => xScale(d.averagePly))
    .attr('cy', d => yScale(d.whiteWinPct))
    .attr('r', 3)
    .attr('fill', 'steelblue')
    .attr('opacity', 0.7)
    .on('mouseover', (event, d) => {
      tooltip.transition().duration(200).style('opacity', 1)
      tooltip.html(
        `<strong>${d.name}</strong><br>` +
        `Nombre moyen de coups durant l'ouverture: ${d.averagePly.toFixed(1)}<br>` +
        `Victoire Blancs: ${d.whiteWinPct.toFixed(1)}%<br>` +
        `Victoire Noirs: ${d.blackWinPct.toFixed(1)}%<br>` +
        `Égalité: ${d.drawPct.toFixed(1)}%`
      ).style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 20) + 'px')
    })
    .on('mousemove', (event) => {
      tooltip.style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 20) + 'px')
    })
    .on('mouseout', () => {
      tooltip.transition().duration(200).style('opacity', 0)
    })
}
