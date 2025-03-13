export function drawStackedBarChart(data, options) {
    const margin = { top: 20, right: 20, bottom: 50, left: 200 };
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Select the target container
    const svg = d3.select(options.target)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define scales
    const x = d3.scaleLinear()
        .domain([0, 100]) // Since we're dealing with percentages
        .nice()
        .range([0, width]); // Extends horizontally

    const y = d3.scaleBand()
        .domain(data.map(d => d.name)) // Openings on the Y-axis
        .range([0, height])
        .padding(0.3);

    const color = d3.scaleOrdinal()
        .domain(["whiteWinPct", "blackWinPct"])
        .range(["#D3D3D3", "#2E2E2E"]); // Light gray for white, dark gray for black

    // Stack the data
    const stack = d3.stack()
        .keys(["whiteWinPct", "blackWinPct"])
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const series = stack(data);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d => d + "%"));

    svg.append('g')
        .call(d3.axisLeft(y));

    // Draw stacked bars
    svg.selectAll('.series')
        .data(series)
        .enter()
        .append('g')
        .attr('fill', d => color(d.key))
        .selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('y', d => y(d.data.name)) // Position by opening name
        .attr('x', d => x(d[0])) // Start at correct X position
        .attr('width', d => x(d[1]) - x(d[0])) // Extend horizontally
        .attr('height', y.bandwidth()); // Keep a consistent height

    // Add legend
    const legendContainer = d3.select("#viz2-legend").html("");

    ["White Win %", "Black Win %"].forEach((label, i) => {
        const legendItem = legendContainer.append("div").attr("class", "legend-item");

        legendItem.append("div")
            .attr("class", "legend-color")
            .style("background", color(["whiteWinPct", "blackWinPct"][i]));

        legendItem.append("span").text(label);
    });


    return svg.node();
}
