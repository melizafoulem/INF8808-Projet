'use strict'

import { drawStackedBarChart } from './scripts/viz2-stacked-bar/viz.js';
import { getAllOpeningNames } from './scripts/preprocess.js';
import { getTopNOpenings } from './scripts/preprocess.js';

(function (d3) {
    d3.csv('./games.csv', d3.autoType).then(function (data) {
        const topOpenings = getTopNOpenings(data, 10);
        
        drawStackedBarChart(topOpenings, {
            target: '#viz2-stacked-bar'
        })
    })
})(d3);