import * as preprocess from "../preprocess.js";
import { VisualizationBase } from "../visualization-base.js";

/**
 * Scatter Plot visualization for opening performance vs. length
 *
 * @augments VisualizationBase
 */
export class ScatterPlotVisualization extends VisualizationBase {
  /**
   * Create a new scatter plot visualization
   *
   * @param {string} containerId - ID of the container element
   * @param {object} options - Visualization options
   */
  constructor(containerId, options = {}) {
    super(containerId, options);

    this.options = {
      ...this.options,
      pointRadius: 5,
      highlightedPointRadius: 8,
      minPointOpacity: 0.6,
      maxPointOpacity: 0.9,
      colorSuccessScale: d3.interpolateRgb("#000000", "#ffffff"),
      ...options,
    };

    this.xAttribute = "averagePly";
  }

  /**
   * Draw the scatter plot visualization
   *
   * @param {Array} data - Chess games dataset
   */
  draw(data) {
    this.initialize();
    this.updateTitle();
    const openingStats = preprocess.getOpeningStats(data);
    if (openingStats.length === 0) {
      this.showNoDataMessage();
      return;
    }
    this.data = openingStats;
    this.drawChart();
  }

  /**
   * Draw the scatter plot chart
   */
  drawChart() {
    const { xScale, yScale } = this.createScales();
    this.drawAxes(xScale, yScale);
    this.drawPoints(xScale, yScale);
  }

  /**
   * Create scales for the scatter plot
   *
   * @returns {object} - Scales for the chart
   */
  createScales() {
    const xScale = d3
      .scaleLinear()
      .domain([
        d3.min(this.data, (d) => d[this.xAttribute]) * 0.9,
        d3.max(this.data, (d) => d[this.xAttribute]) * 1.1,
      ])
      .range([0, this.graphSize.width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([this.graphSize.height, 0]);

    return { xScale, yScale };
  }

  /**
   * Draw axes for the scatter plot
   *
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   */
  drawAxes(xScale, yScale) {
    this.xAxis = this.createXAxis(xScale, this.getXAxisLabel());
    this.createYAxis(yScale, "Pourcentage de victoire des blancs (%)");
  }

  /**
   * Get label for X axis based on current attribute
   *
   * @returns {string} - Axis label
   */
  getXAxisLabel() {
    return this.xAttribute === "averagePly"
      ? "Nombre moyen de coups durant l'ouverture"
      : "Nombre moyen de tours";
  }

  /**
   * Draw points on the scatter plot
   *
   * @param {Function} xScale - X scale
   * @param {Function} yScale - Y scale
   */
  drawPoints(xScale, yScale) {
    const countExtent = d3.extent(this.data, (d) => d.total || 0);
    const sizeScale = d3.scaleLinear().domain(countExtent).range([3, 10]);

    const opacityScale = d3
      .scaleLinear()
      .domain(countExtent)
      .range([this.options.minPointOpacity, this.options.maxPointOpacity]);

    this.graphGroup
      .selectAll(".dot")
      .data(this.data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => xScale(d[this.xAttribute]))
      .attr("cy", (d) => yScale(d.whiteWinPct))
      .attr("r", (d) => sizeScale(d.total || 0))
      .attr("fill", (d) => this.options.colorSuccessScale(d.whiteWinPct / 100))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .attr("opacity", (d) => opacityScale(d.total || 0))
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        d3.select(event.target)
          .attr("stroke", "#333")
          .attr("stroke-width", 2)
          .attr("r", this.options.highlightedPointRadius);

        this.showTooltip(event, this.createTooltipContent(d));
      })
      .on("mousemove", (event) => {
        this.moveTooltip(event);
      })
      .on("mouseout", (event) => {
        d3.select(event.target)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5)
          .attr("r", (d) => sizeScale(d.total || 0));

        this.hideTooltip();
      });
  }

  /**
   * Create tooltip content for data point
   *
   * @param {object} d - Opening stats data point
   * @returns {string} - HTML content for tooltip
   */
  createTooltipContent(d) {
    return `
      <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">${
        d.name
      }</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee;">Coups durant l'ouverture:</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${d.averagePly.toFixed(
            1
          )}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee;">Nombre de tours:</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right;">${d.averageTurns.toFixed(
            1
          )}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee;">Victoire Blancs:</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right;">${d.whiteWinPct.toFixed(
            1
          )}%</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee;">Victoire Noirs:</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right;">${d.blackWinPct.toFixed(
            1
          )}%</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Égalité:</td>
          <td style="padding: 4px 0; text-align: right;">${d.drawPct.toFixed(
            1
          )}%</td>
        </tr>
      </table>
    `;
  }

  /**
   * Update the chart title based on current x attribute
   */
  updateTitle() {
    this.setTitle(
      this.xAttribute === "averagePly"
        ? "Taux de performance des ouvertures selon le nombre de coups durant l'ouverture"
        : "Taux de performance des ouvertures selon le nombre de tours"
    );
  }

  /**
   * Show message when no data is available
   */
  showNoDataMessage() {
    this.graphGroup
      .append("text")
      .attr("class", "no-data-message")
      .attr("x", this.graphSize.width / 2)
      .attr("y", this.graphSize.height / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("fill", "#666")
      .text("Aucune donnée disponible pour les filtres sélectionnés");
  }
}

/**
 * Create and draw the scatter plot visualization
 *
 * @param {Array} data - Chess games dataset
 * @param {object} svgSize - Size of the SVG
 * @param {object} margin - Margins around the graph
 * @param {object} graphSize - Size of the graph
 */
export function drawViz(data, svgSize, margin, graphSize) {
  const plyViz = new ScatterPlotVisualization("viz5-ply", {
    width: svgSize.width,
    height: svgSize.height,
    margin,
  });
  plyViz.xAttribute = "averagePly";
  plyViz.draw(data);

  const turnsViz = new ScatterPlotVisualization("viz5-turns", {
    width: svgSize.width,
    height: svgSize.height,
    margin,
  });
  turnsViz.xAttribute = "averageTurns";
  turnsViz.draw(data);
}
