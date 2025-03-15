'use strict'

import * as helper from './scripts/helper.js';
import * as viz2 from './scripts/viz2-stacked-bar/viz.js';
import * as preprocess from './scripts/preprocess.js';

(function (d3) {
  const margin = { top: 75, right: 200, bottom: 100, left: 80 };
  const svgSize = { width: 1000, height: 600 };
  const graphSize = {
    width: svgSize.width - margin.right - margin.left,
    height: svgSize.height - margin.bottom - margin.top
  };

  d3.csv('./games.csv', d3.autoType).then(function (data) {
    const topOpeningWinners = preprocess.getTopNOpeningsWinners(data, 10);
    const topOpeningResults = preprocess.getTopNOpeningsWithResults(data, 10);

    const svgStacked = d3.select('#viz2-stacked-bar')
      .append('svg')
      .attr('width', svgSize.width)
      .attr('height', svgSize.height);

    const gStacked = svgStacked.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const svgVictory = d3.select('#viz2-victory-status')
      .append('svg')
      .attr('width', svgSize.width)
      .attr('height', svgSize.height);

    const gVictory = svgVictory.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const { x, y } = helper.drawAxes(topOpeningWinners, gStacked, graphSize);

    viz2.drawStackedBarChart(topOpeningWinners, { g: gStacked, x, y });

    helper.drawAxes(topOpeningResults, gVictory, graphSize);
    viz2.drawVictoryStatusChart(topOpeningResults, { g: gVictory, x, y });

    d3.select('#viz2-victory-container')
      .style('display', 'none')
      .style('opacity', 0);

    setClickHandler();
  });

  function setClickHandler() {
    let isShowingVictory = false; // The stacked bar is visible initially

    d3.select('#toggle-victory-chart').on('click', function() {
      isShowingVictory = !isShowingVictory;

      if (isShowingVictory) {
        // Hide stacked bar
        d3.select('#viz2-stacked-bar-container')
          .transition()
          .duration(500)
          .style('opacity', 0)
          .on('end', () => {
            d3.select('#viz2-stacked-bar-container')
              .style('display', 'none');
          });

        // Show victory
        d3.select('#viz2-victory-container')
          .style('display', 'flex')
          .transition()
          .duration(500)
          .style('opacity', 1);

        d3.select(this).text('Hide Victory Status Chart');
      } else {
        // Hide victory
        d3.select('#viz2-victory-container')
          .transition()
          .duration(500)
          .style('opacity', 0)
          .on('end', () => {
            d3.select('#viz2-victory-container')
              .style('display', 'none');
          });

        // Show stacked bar
        d3.select('#viz2-stacked-bar-container')
          .style('display', 'flex')
          .transition()
          .duration(500)
          .style('opacity', 1);

        d3.select(this).text('Show Victory Status Chart');
      }
    });
  }
})(d3);
