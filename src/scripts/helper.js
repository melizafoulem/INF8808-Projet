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