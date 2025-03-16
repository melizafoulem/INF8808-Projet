import * as preprocess from '../preprocess.js';
import * as d3 from 'd3';

export function drawViz(data, svgSize, margin, graphSize) {
  const topOpeningWinnersPerElo = preprocess.getWinRateByOpeningAcrossEloRanges(data, 5);
  console.log(topOpeningWinnersPerElo);

  d3.select('#viz3-chart-title')
    .text('Taux de performance des ouvertures');

  const svg = d3.select('#viz3')
    .append('svg')
    .attr('width', svgSize.width)
    .attr('height', svgSize.height);

  const tooltip = d3.select('#viz3')
    .append('div')
    .attr('class', 'tooltip-viz3')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', 'rgba(0, 0, 0, 0.7)')
    .style('color', 'white')
    .style('padding', '5px')
    .style('border-radius', '5px');

  const xScale = d3.scaleLinear()
    .domain([d3.min(topOpeningWinnersPerElo, d => parseInt(d.range.split('-')[0])),
             d3.max(topOpeningWinnersPerElo, d => parseInt(d.range.split('-')[1]))])
    .range([margin.left, svgSize.width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([0, 100])
    .range([svgSize.height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const line = d3.line()
    .x(d => xScale(parseInt(d.range.split('-')[0])))
    .y(d => yScale(d.whiteWinPct));

  const openings = Array.from(new Set(topOpeningWinnersPerElo.flatMap(d => d.openings.map(o => o.name))));

  const groupedData = openings.map(opening => ({
    name: opening,
    values: topOpeningWinnersPerElo.map(d => {
      const found = d.openings.find(o => o.name === opening);
      return {
        range: d.range,
        whiteWinPct: found ? found.whiteWinPct : 0,
        blackWinPct: found ? found.blackWinPct : 0,
        total: found ? found.total : 0
      };
    })
  }));

  svg.append('g')
    .attr('transform', `translate(0,${svgSize.height - margin.bottom})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale));

  svg.selectAll('.line')
    .data(groupedData)
    .enter().append('path')
    .attr('class', 'line')
    .attr('fill', 'none')
    .attr('stroke', d => color(d.name))
    .attr('stroke-width', 2)
    .attr('d', d => line(d.values))
    .on('mouseover', function (event, d) {
      d3.select(this).attr('stroke-width', 4);
      tooltip.style('visibility', 'visible')
        .html(`<strong>${d.name}</strong><br/>
               Taux de victoire Blancs: ${d.values[0].whiteWinPct.toFixed(2)}%<br/>
               Taux de victoire Noirs: ${d.values[0].blackWinPct.toFixed(2)}%<br/>
               Total parties: ${d.values[0].total}`);
    })
    .on('mousemove', function (event) {
      tooltip.style('top', `${event.pageY - 10}px`).style('left', `${event.pageX + 10}px`);
    })
    .on('mouseout', function () {
      d3.select(this).attr('stroke-width', 2);
      tooltip.style('visibility', 'hidden');
    });

  const legend = svg.append('g')
    .attr('transform', `translate(${svgSize.width - margin.right - 50}, ${margin.top})`);

  legend.selectAll('rect')
    .data(groupedData)
    .enter().append('rect')
    .attr('x', 0)
    .attr('y', (d, i) => i * 20)
    .attr('width', 12)
    .attr('height', 12)
    .attr('fill', d => color(d.name));

  legend.selectAll('text')
    .data(groupedData)
    .enter().append('text')
    .attr('x', 15)
    .attr('y', (d, i) => i * 20 + 10)
    .text(d => d.name)
    .attr('font-size', '12px')
    .attr('alignment-baseline', 'middle');
}