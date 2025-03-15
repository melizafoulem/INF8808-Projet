'use strict'

import * as helper from './scripts/helper.js';
import * as viz2 from './scripts/viz2-stacked-bar/viz.js';
import * as preprocess from './scripts/preprocess.js';

(function (d3) {
  const margin = { top: 40, right: 100, bottom: 100, left: 150 };
  const svgSize = { width: 1000, height: 600 };
  const graphSize = {
    width: svgSize.width - margin.right - margin.left,
    height: svgSize.height - margin.bottom - margin.top
  };

  d3.csv('./games.csv', d3.autoType).then(function (data) {

    viz2.drawViz(data, svgSize, margin, graphSize);
  });
})(d3);
