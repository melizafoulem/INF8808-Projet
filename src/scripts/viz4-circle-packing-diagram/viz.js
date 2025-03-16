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
  svg.attr('width', 1600).attr('height', 1300);
  

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
    .attr("transform", `translate(1250, 50)`);

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

  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("padding", "5px 10px")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  node.filter(d => d.depth === 2)
    .select("circle")
    .on("mouseover", (event, d) => {
      const parentChildrenSum = d.parent.children.reduce((acc, c) => acc + c.value, 0);
      const fraction = (d.value / parentChildrenSum) * 100;
      tooltip
        .transition()
        .duration(200)
        .style("opacity", 1);
      tooltip
        .html(
          "<strong>Opening:</strong> " + d.parent.data.name + "<br/>" +
          "<strong>Variation:</strong> " + d.data.name + "<br/>" +
          "<strong>Percentage:</strong> " + fraction.toFixed(2) + "%"
        )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", () => {
      tooltip
        .transition()
        .duration(200)
        .style("opacity", 0);
    });
}
