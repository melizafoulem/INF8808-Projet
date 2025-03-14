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
        .domain([0, 100])
        .nice()
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(data.map(d => d.name))
        .range([0, height])
        .padding(0.3);

    const color = d3.scaleOrdinal()
        .domain(["whiteWinPct", "drawPct", "blackWinPct"])
        .range(["#D3D3D3", "#808080", "#2E2E2E"]);

    // Stack the data
    const stack = d3.stack()
        .keys(["whiteWinPct", "drawPct", "blackWinPct"])
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const series = stack(data);

    // Add axes
    // svg.append('g')
    //     .attr('transform', `translate(0,${height})`)
    //     .call(d3.axisBottom(x).ticks(10).tickFormat(d => d + "%"));

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
        .attr('y', d => y(d.data.name))
        .attr('x', d => x(d[0]))
        .attr('width', d => x(d[1]) - x(d[0]))
        .attr('height', y.bandwidth())
        .on('mouseover', function (event, d) {
            showTooltip(event, d[1] - d[0]);
        })
        .on('mousemove', function (event) {
            moveTooltip(event);
        })
        .on('mouseout', function () {
            hideTooltip();
        });

    // Add legend
    const legendContainer = d3.select("#viz2-legend").html("");

    ["White Win %", "Draw %", "Black Win %"].forEach((label, i) => {
        const legendItem = legendContainer.append("div").attr("class", "legend-item");

        legendItem.append("div")
            .attr("class", "legend-color")
            .style("background", color(["whiteWinPct", "drawPct", "blackWinPct"][i]));

        legendItem.append("span").text(label);
    });


    return svg.node();
}

function showTooltip(event, value) {
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "5px 10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    tooltip.transition().duration(200).style("opacity", 1);
    tooltip.html(value.toFixed(2) + "%")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
}

function moveTooltip(event) {
    d3.select(".tooltip")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
}

function hideTooltip() {
    d3.select(".tooltip").remove();
}


export function drawVictoryStatusChart(data, options) {
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
        .domain([0, 100])
        .nice()
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(data.map(d => d.name))
        .range([0, height])
        .padding(0.3);

    const color = d3.scaleOrdinal()
        .domain(["matePct", "resignPct", "outoftimePct", "drawPct"])
        .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"]); // Blue, Orange, Green, Red

    // Stack the data
    const stack = d3.stack()
        .keys(["matePct", "resignPct", "outoftimePct", "drawPct"])
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const series = stack(data);

    // Add axes
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
        .attr('y', d => y(d.data.name))
        .attr('x', d => x(d[0]))
        .attr('width', d => x(d[1]) - x(d[0]))
        .attr('height', y.bandwidth())
        .on('mouseover', function (event, d) {
            showTooltip(event, d[1] - d[0]);
        })
        .on('mousemove', function (event) {
            moveTooltip(event);
        })
        .on('mouseout', function () {
            hideTooltip();
        });

    // Add legend
    const legendContainer = d3.select("#viz2-victory-legend").html("");

    ["Checkmate %", "Resignation %", "Out of Time %", "Draw %"].forEach((label, i) => {
        const legendItem = legendContainer.append("div").attr("class", "legend-item");

        legendItem.append("div")
            .attr("class", "legend-color")
            .style("background", color(["matePct", "resignPct", "outoftimePct", "drawPct"][i]));

        legendItem.append("span").text(label);
    });

    return svg.node();
}


