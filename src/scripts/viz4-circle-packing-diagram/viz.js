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
    .size([1300, 1300])
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
    svg.attr('width', 1300).attr('height', 1300);
  }

  svg.selectAll("*").remove();
  const g = svg.append("g");
  const nodes = root.descendants().filter(d => d.depth);

  const node = g.selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  node.append("circle")
    .attr("r", d => d.r)
    .attr("fill", d => d.children ? "#ccc" : "#69b3a2")
    .attr("stroke", "#333")
    .attr("stroke-width", 1);

  node.filter(d => d.depth === 1)
    .append("text")
    .attr("dy", "0.3em")
    .attr("text-anchor", "middle")
    .text(d => d.data.name)
    .style("font-size", d => Math.min(2 * d.r, 16))
    .style("fill", "#000");

  node.filter(d => d.depth === 2)
    .append("text")
    .attr("dy", "0.3em")
    .attr("text-anchor", "middle")
    .text(d => {
      const firstWord = d.data.name.split(/\s+/)[0];
      return firstWord;
    })
    .style("font-size", d => Math.min(2 * d.r, 12))
    .style("fill", "#000")
    .on("mouseover", (event, d) => {
    })
    .on("mousemove", (event) => {
    })
    .on("mouseout", () => {
    });
}
