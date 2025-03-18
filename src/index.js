'use strict'

import * as helper from './scripts/helper.js';
import * as preprocess from './scripts/preprocess.js';
import * as viz2 from './scripts/viz2-stacked-bar/viz.js';
import * as viz3 from './scripts/viz3-line-chart/viz.js';
import * as viz4 from './scripts/viz4-circle-packing-diagram/viz.js';
import * as viz5 from './scripts/viz5-scatter-plot/viz.js';

(function (d3) {
  const margin = { top: 40, right: 100, bottom: 100, left: 150 };
  const svgSize = { width: 1000, height: 600 };
  const graphSize = {
    width: svgSize.width - margin.right - margin.left,
    height: svgSize.height - margin.bottom - margin.top
  };

  d3.csv('./games.csv', d3.autoType).then(function (data) {

    viz2.drawViz(data, svgSize, margin, graphSize);
    viz3.drawViz(data, svgSize, margin, graphSize);
    viz4.drawViz(data, svgSize, margin, graphSize);
    viz5.drawViz(data, svgSize, margin, graphSize);
  });
})(d3);
