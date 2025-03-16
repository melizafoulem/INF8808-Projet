import * as preprocess from '../preprocess.js';

export function drawViz(data, svgSize) {
  const topOpenings = preprocess.getNOpeningVariations(data, 10);
  const VARIATION_INFLATION_FACTOR = 2.0;

  const hierarchyData = {
    name: "openings",
    children: Object.entries(topOpenings).map(([openingName, details]) => {
      const children = Object.entries(details.variations).map(([varName, varCount]) => ({
        name: varName,
        count: varCount * VARIATION_INFLATION_FACTOR
      }));
      const sumOfInflatedChildren = children.reduce((acc, c) => acc + c.count, 0);
      return {
        name: openingName,
        count: details.count + sumOfInflatedChildren,
        children
      };
    })
  };

  const root = d3.hierarchy(hierarchyData)
    .sum(d => d.count)
    .sort((a, b) => b.value - a.value);

  const pack = d3.pack()
    .size([1700, 1300])
    .padding(3);

  pack(root);

  let svg = d3.select('#viz4');
  if (svg.empty()) {
    svg = d3.select('body')
      .append('svg')
      .attr('id', 'viz4')
      .attr('width', 2000)
      .attr('height', 2000);
  } else {
    svg.attr('width', 2000).attr('height', 1300);
  }

  svg.selectAll("*").remove();

  const topLevelNodes = root.children || [];
  const colorScale = d3.scaleOrdinal()
    .domain(topLevelNodes.map(d => d.data.name))
    .range(d3.schemeCategory10);

  const g = svg.append("g");
  const nodes = root.descendants().filter(d => d.depth);

  const node = g.selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  node.append("circle")
    .attr("r", d => d.r)
    .attr("fill", d => {
      if (d.depth === 1) {
        return colorScale(d.data.name);
      }
      const parentColor = colorScale(d.parent.data.name);
      return d3.color(parentColor).brighter(1.5);
    });

  node.filter(d => d.depth === 2)
    .append("text")
    .attr("dy", "0.3em")
    .attr("text-anchor", "middle")
    .text(d => d.data.name)
    .style("font-size", d => Math.min(2 * d.r, 12))
    .style("fill", "#000")
    .each(function(d) {
      const textSel = d3.select(this);
      let label = textSel.text();
      let bbox = this.getBBox();
      while (bbox.width > 2 * d.r && label.length > 0) {
        label = label.slice(0, -1);
        textSel.text(label);
        bbox = this.getBBox();
      }
    });

  const legendGroup = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(1500, 50)`)

  const legendItems = legendGroup.selectAll(".legend-item")
    .data(topLevelNodes)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`);

  legendItems.append("circle")
    .attr("r", 10)
    .attr("cx", 10)
    .attr("cy", 10)
    .attr("fill", d => colorScale(d.data.name));

  legendItems.append("text")
    .attr("x", 30)
    .attr("y", 15)
    .text(d => d.data.name)
    .style("font-size", "14px");
}
