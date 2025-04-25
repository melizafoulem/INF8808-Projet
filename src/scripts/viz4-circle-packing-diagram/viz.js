import * as preprocess from "../preprocess.js";

/**
 * Circle Packing visualization for chess opening variants
 */
export class CirclePackingVisualization {
  /**
   * Create a new circle packing visualization
   *
   * @param {string} svgId - ID of the SVG element
   * @param {object} options - Visualization options
   */
  constructor(svgId, options = {}) {
    this.svgId = svgId;
    this.svg = d3.select(`#${svgId}`);

    // Set default options
    this.options = {
      width: 1000,
      height: 800,
      padding: 3,
      numOpenings: 10,
      colorScheme: d3.schemeTableau10,
      variationInflationFactor: 2.0,
      ...options,
    };

    this.currentPage = 0;
    this.itemsPerPage = this.options.numOpenings;
    this.fullOpeningFamilies = [];

    this.createTooltip();
  }

  /**
   * Draw the circle packing visualization
   *
   * @param {Array} data - Chess games dataset
   */
  draw(data) {
    const container = d3.select(`#${this.svgId}`);
    container.selectAll("*").remove(); // Clear previous content

    const topOpenings = preprocess.getNOpeningVariations(
      data,
      this.options.numOpenings
    );
    if (!topOpenings || Object.keys(topOpenings).length === 0) {
      this.showNoDataMessage();
      return;
    }

    // Split into separate families
    const openingFamilies = Object.entries(topOpenings).map(
      ([name, details]) => {
        const children = Object.entries(details.variations).map(
          ([varName, varCount]) => ({
            name: varName || "Principal",
            count: varCount * this.options.variationInflationFactor,
          })
        );

        if (children.length === 0) {
          children.push({
            name: "Principal",
            count: details.count * 0.8,
          });
        }

        return { name, children };
      }
    );

    this.fullOpeningFamilies = openingFamilies.slice(
      0,
      this.options.numOpenings
    );
    this.renderAllFamilies();
  }

  renderAllFamilies() {
    const container = d3.select(`#${this.svgId}`);
    container.selectAll("*").remove();

    const grid = container.append("div").attr("class", "circle-multiple-grid");

    const colorScale = d3
      .scaleOrdinal()
      .domain(this.fullOpeningFamilies.map((d) => d.name))
      .range(this.options.colorScheme);

    this.fullOpeningFamilies.forEach((family) => {
      const chart = grid.append("div").attr("class", "circle-multiple-chart");

      this.appendTitleWithTooltip(chart, family);

      const svg = chart.append("svg").attr("width", 280).attr("height", 280);

      this.drawCirclePack(family, svg, colorScale(family.name));
    });
  }

  drawCirclePack(familyData, svg, color) {
    const root = d3
      .hierarchy(familyData)
      .sum((d) => d.count)
      .sort((a, b) => b.value - a.value);

    const pack = d3.pack().size([280, 280]).padding(this.options.padding);

    const nodes = pack(root).descendants().slice(1); // exclude root

    const g = svg.append("g").attr("transform", "translate(0,0)");

    const node = g
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    node
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) =>
        d.depth === 1 ? color : d3.color(color).brighter(1.5)
      )
      .attr("stroke", (d) => (d.depth === 1 ? "#fff" : "none"))
      .attr("stroke-width", 1.5);

    // Add visible labels if the radius is big enough
    node
      .filter((d) => d.r > 12)
      .append("text")
      .attr("dy", "0.3em")
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => Math.min(2 * d.r, 12))
      .attr("fill", "#000")
      .text((d) => d.data.name)
      .each(function (d) {
        const textElement = d3.select(this);
        let text = textElement.text();
        let textLength = this.getComputedTextLength();
        const maxWidth = 2 * d.r * 0.8;

        while (textLength > maxWidth && text.length > 3) {
          text = text.slice(0, text.length - 4) + "...";
          textElement.text(text);
          textLength = this.getComputedTextLength();
        }

        if (textLength > maxWidth) {
          textElement.text("");
        }
      });

    // Keep the title tooltip for hover
    this.addCircleInteractions(node);
  }

  /**
   * Create hierarchical data structure for circle packing
   *
   * @param {object} topOpenings - Top opening data
   * @returns {object} - Hierarchical data for circle packing
   */
  createHierarchyData(topOpenings) {
    return {
      name: "openings",
      children: Object.entries(topOpenings).map(([openingName, details]) => {
        const children = Object.entries(details.variations).map(
          ([varName, varCount]) => ({
            name: varName || "Principal",
            count: varCount * this.options.variationInflationFactor,
          })
        );

        // Add a node for the main line if there are no explicit variations
        if (children.length === 0) {
          children.push({
            name: "Principal",
            count: details.count * 0.8, // Use 80% of total count for the main line
          });
        }

        // Calculate total size for parent node
        const sumOfInflatedChildren = children.reduce(
          (acc, c) => acc + c.count,
          0
        );

        return {
          name: openingName,
          count: details.count + sumOfInflatedChildren,
          children,
        };
      }),
    };
  }

  /**
   * Draw circles for nodes
   *
   * @param {Selection} g - Group element
   * @param {Array} nodes - Hierarchical nodes
   * @param {Function} colorScale - Color scale
   */
  drawCircles(g, nodes, colorScale) {
    const node = g
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Draw circles
    node
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => {
        if (d.depth === 1) {
          return colorScale(d.data.name);
        }
        // For variants, use a lighter shade of parent color
        const parentColor = colorScale(d.parent.data.name);
        return d3.color(parentColor).brighter(1.5);
      })
      .attr("stroke", (d) => (d.depth === 1 ? "#fff" : "none"))
      .attr("stroke-width", 1.5)
      .attr("class", (d) => `circle-${d.depth}`);

    // Add text labels
    node
      .filter((d) => d.depth === 1 || (d.depth === 2 && d.r > 12))
      .append("text")
      .attr("dy", (d) => (d.depth === 1 ? 0 : "0.3em"))
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => Math.min(2 * d.r, d.depth === 1 ? 18 : 12))
      .attr("fill", (d) => (d.depth === 1 ? "#fff" : "#000"))
      .text((d) => d.data.name)
      .each(function (d) {
        // Truncate text that's too wide
        const textElement = d3.select(this);
        let text = textElement.text();
        let textLength = this.getComputedTextLength();

        // Try to fit text within circle
        const maxWidth = 2 * d.r * 0.8; // 80% of diameter
        while (textLength > maxWidth && text.length > 3) {
          text = text.slice(0, text.length - 4) + "...";
          textElement.text(text);
          textLength = this.getComputedTextLength();
        }

        // Hide text completely if still too large
        if (textLength > maxWidth) {
          textElement.text("");
        }
      });

    // Add interactive behaviors
    this.addCircleInteractions(node);
  }

  /**
   * Append a title with an info icon and tooltip
   *
   * @param {Selection} parent - The parent D3 selection to append the title to
   * @param {object} family - The family data object
   */
  appendTitleWithTooltip(parent, family) {
    const titleContainer = parent
      .append("div")
      .attr("class", "chart-title-container")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "6px");

    titleContainer
      .append("h4")
      .attr("class", "chart-title")
      .text(family.name)
      .style("margin", "0");

    const icon = titleContainer
      .append("span")
      .attr("class", "info-icon")
      .html("&#9432;") // ℹ️ icon
      .style("cursor", "pointer")
      .style("font-size", "16px")
      .style("color", "#666");

    let tooltipVisibleFor = null;

    icon.on("click", (event) => {
      event.stopPropagation(); // Prevent immediate close

      const tooltip = d3.select(".tooltip");
      const currentFamily = family.name;

      if (
        tooltip.style("opacity") === "1" &&
        tooltipVisibleFor === currentFamily
      ) {
        tooltip.transition().duration(200).style("opacity", 0);
        tooltipVisibleFor = null;
        return;
      }

      const totalGames = Math.round(
        family.children.reduce((sum, v) => sum + v.count, 0) /
          this.options.variationInflationFactor
      );

      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `
      <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${
        family.name
      }</div>
      <div style="font-size: 14px; margin-bottom: 5px;">
        <span style="font-weight: bold;">${totalGames}</span> parties au total
      </div>
      <div style="font-size: 12px; color: #666;">
        ${family.children.length} variante${
            family.children.length > 1 ? "s" : ""
          }
      </div>
    `
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");

      tooltipVisibleFor = currentFamily;

      // Close tooltip on outside click
      d3.select("body").on("click.tooltip", function (e) {
        if (!e.target.closest(".info-icon")) {
          tooltip.transition().duration(200).style("opacity", 0);
          tooltipVisibleFor = null;
          d3.select("body").on("click.tooltip", null);
        }
      });
    });
  }

  /**
   * Add interactive behaviors to circles
   *
   * @param {Selection} node - Node elements
   */
  addCircleInteractions(node) {
    const tooltip = d3.select("body").select(".tooltip");
    node
      .filter((d) => d.depth === 1)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .select("circle")
          .attr("stroke", "#333")
          .attr("stroke-width", 2);

        const parentTotal = d.parent.value;
        const percentage = (d.value / parentTotal) * 100;

        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
          .html(
            `
          <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${
            d.parent.data.name
          }</div>
          <div style="margin-bottom: 8px; font-size: 11px; color: #777;">Variante: ${
            d.data.name || "Principal"
          }</div>
          <div style="font-size: 14px; margin-bottom: 5px;">
            <span style="font-weight: bold;">${percentage.toFixed(
              1
            )}%</span> des parties
          </div>
          <div style="font-size: 12px; color: #666;">
            (${Math.round(
              d.value / this.options.variationInflationFactor
            )} parties sur ${Math.round(
              parentTotal / this.options.variationInflationFactor
            )})
          </div>
        `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).select("circle").attr("stroke", "none");

        tooltip.transition().duration(500).style("opacity", 0);
      });
  }

  /**
   * Create legend for openings
   *
   * @param {Array} topLevelNodes - Top level nodes
   * @param {Function} colorScale - Color scale
   */
  createLegend(topLevelNodes, colorScale) {
    const legendGroup = this.svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${this.options.width - 230}, 50)`);

    // Add title
    legendGroup
      .append("text")
      .attr("x", 0)
      .attr("y", -20)
      .attr("font-size", 14)
      .attr("font-weight", "bold")
      .text("Familles d'ouvertures");

    // Create legend items
    const legendItems = legendGroup
      .selectAll(".legend-item")
      .data(topLevelNodes)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        // Highlight corresponding circle
        this.svg
          .selectAll(".circle-1")
          .attr("opacity", (node) =>
            node.data.name === d.data.name ? 1 : 0.3
          );

        // Highlight legend item
        d3.select(event.currentTarget)
          .select("text")
          .attr("font-weight", "bold");
      })
      .on("mouseout", () => {
        // Restore all circles
        this.svg.selectAll(".circle-1").attr("opacity", 1);

        // Restore legend items
        legendGroup.selectAll("text").attr("font-weight", "normal");
      });

    // Add colored circles
    legendItems
      .append("circle")
      .attr("r", 7)
      .attr("cx", 10)
      .attr("cy", 10)
      .attr("fill", (d) => colorScale(d.data.name));

    // Add opening names
    legendItems
      .append("text")
      .attr("x", 25)
      .attr("y", 15)
      .text((d) => {
        // Truncate long names
        if (d.data.name.length > 20) {
          return d.data.name.substring(0, 18) + "...";
        }
        return d.data.name;
      })
      .style("font-size", "14px");
  }

  /**
   * Create tooltip
   */
  createTooltip() {
    // Remove any existing tooltip
    d3.select("body").select("#viz4-tooltip").remove();

    // Create new tooltip
    d3.select("body")
      .append("div")
      .attr("id", "viz4-tooltip")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "10px")
      .style("background", "rgba(255, 255, 255, 0.95)")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-family", "'Roboto', sans-serif")
      .style("font-size", "12px")
      .style("box-shadow", "0 4px 8px rgba(0,0,0,0.1)")
      .style("opacity", 0)
      .style("z-index", 1000);
  }

  /**
   * Show message when no data is available
   */
  showNoDataMessage() {
    this.svg
      .append("text")
      .attr("x", this.options.width / 2)
      .attr("y", this.options.height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", "#666")
      .text("Aucune donnée disponible pour les filtres sélectionnés");
  }
}

/**
 * Create and draw the circle packing visualization
 *
 * @param {Array} data - Chess games dataset
 * @param {object} svgSize - Size of the SVG
 * @param {object} margin - Margins around the graph
 * @param {object} graphSize - Size of the graph
 */
export function drawViz(data, svgSize, margin, graphSize) {
  const circlePacking = new CirclePackingVisualization("viz4", {
    width: svgSize.width,
    height: svgSize.height,
    padding: 3,
    topOpenings: 10,
  });

  circlePacking.draw(data);
}
