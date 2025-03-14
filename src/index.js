'use strict'

import * as helper from './scripts/helper.js';
import * as viz2 from './scripts/viz2-stacked-bar/viz.js';
import * as preprocess from './scripts/preprocess.js';

(function (d3) {
    const margin = {
        top: 75,
        right: 200,
        bottom: 100,
        left: 80
    };

    const g = helper.generateG(margin);
    let svgSize, graphSize;
    setSizing();

    //helper.drawButton(g, graphSize.width);

    d3.csv('./games.csv', d3.autoType).then(function (data) {
        
        const topOpeningWinners = preprocess.getTopNOpeningsWinners(data, 10);
        const topOpeningResults = preprocess.getTopNOpeningsWithResults(data, 10);
        
        viz2.drawStackedBarChart(topOpeningWinners, {target: '#viz2-stacked-bar'});
        viz2.drawVictoryStatusChart(topOpeningResults, { target: '#viz2-victory-status'});

        setClickHandler()

    /**
     *   Sets up the click handler for the button.
     */
    function setClickHandler () {
        d3.select('#toggle-victory-chart')
          .on('click', () => {
            const stackedBarGraph = d3.select('#viz2-stacked-bar');
            const victoryGraphContainer = d3.select('#viz2-victory-container');
            const isVictoryGraphVisible = victoryGraphContainer.style('display') === 'block';

            if (isVictoryGraphVisible) {
                victoryGraphContainer.transition()
                    .duration(500)
                    .style('opacity', 0)
                    .on('end', () => victoryGraphContainer.style('display', 'none'));

                    stackedBarGraph.style('display', 'block')
                    .transition()
                    .duration(500)
                    .style('opacity', 1);

                d3.select('#toggle-victory-chart').text('Show Victory Status Chart');
            } else {
                stackedBarGraph.transition()
                .duration(500)
                .style('opacity', 0)
                .on('end', () => stackedBarGraph.style('display', 'none'));

                victoryGraphContainer.style('display', 'block')
                    .transition()
                    .duration(500)
                    .style('opacity', 1);
                    
                d3.select('#toggle-victory-chart').text('Hide Victory Status Chart');
            }
        });
      }
    })

    /**
   *   This function handles the graph's sizing.
   */
  function setSizing () {
    svgSize = {
      width: 1000,
      height: 600
    }

    graphSize = {
      width: svgSize.width - margin.right - margin.left,
      height: svgSize.height - margin.bottom - margin.top
    }

    helper.setCanvasSize(svgSize.width, svgSize.height)
  }
})(d3);