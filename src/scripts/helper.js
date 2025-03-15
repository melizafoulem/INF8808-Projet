export function generateG (margin) {
    return d3.select('.graph')
      .select('svg')
      .append('g')
      .attr('id', 'graph-g')
      .attr('transform',
        'translate(' + margin.left + ',' + margin.top + ')')
  }

  export function drawButton(g, width) {
    const button = g.append('g')
      .attr('class', 'button')
      .attr('transform', 'translate(' + width + ', 140)')
      .attr('width', 130)
      .attr('height', 25)
  
    button.append('rect')
      .attr('width', 130)
      .attr('height', 30)
      .attr('fill', '#f4f6f4')
      .on('mouseenter', function () {
        d3.select(this).attr('stroke', '#362023')
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', '#f4f6f4')
      })
  
    button.append('text')
      .attr('x', 65)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('class', 'button-text')
      .text('Show Victory Status Chart')
      .attr('font-size', '10px')
      .attr('fill', '#362023')
  }

  /**
 * Sets the size of the SVG canvas containing the graph.
 *
 * @param {number} width The desired width
 * @param {number} height The desired height
 */
export function setCanvasSize (width, height) {
  d3.select('#bubble-chart')
    .attr('width', width)
    .attr('height', height)
}

export function drawAxes(data, g, graphSize) {
  const x = d3.scaleLinear().domain([0, 100]).range([0, graphSize.width]);
  const y = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, graphSize.height])
      .padding(0.3);

  g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y));

  g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${graphSize.height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d => d + "%"));

  return { x, y };
}