'use strict'

import { drawStackedBarChart } from './scripts/viz2-stacked-bar/viz.js';

(function (d3) {
    d3.csv('./games.csv', d3.autoType).then(function (data) {
        console.log(data);
        
        drawStackedBarChart(data, {
            target: '#viz2-stacked-bar'
        })
    })
})(d3);