'use strict'

import * as helper from './scripts/helper.js';
import * as preprocess from './scripts/preprocess.js';
import * as viz1 from './scripts/viz1-heatmap/viz.js';
import * as viz2 from './scripts/viz2-stacked-bar/viz.js';
import * as viz3 from './scripts/viz3-line-chart/viz.js';
import * as viz4 from './scripts/viz4-circle-packing-diagram/viz.js';
import * as viz5 from './scripts/viz5-scatter-plot/viz.js';

(function (d3) {
  // Configuration for all visualizations
  const margin = { top: 40, right: 100, bottom: 100, left: 150 };
  const svgSize = { width: 1000, height: 600 };
  const graphSize = {
    width: svgSize.width - margin.right - margin.left,
    height: svgSize.height - margin.bottom - margin.top
  };

  // Application state
  let state = {
    data: null,
    filters: {
      opening: 'all',
      elo: 'all',
      color: 'both',
      gameType: 'all',
      timeControl: 'all',
      search: ''
    }
  };

  // Initialize the application
  function init() {
    // Load data
    d3.csv('./games.csv', d3.autoType)
      .then(function (data) {
        console.log('Data loaded successfully:', data.length, 'rows');
        state.data = data;
        
        // Initialize filter dropdowns
        initializeFilters(data);
        
        // Draw all visualizations
        drawVisualizations(data);
        
        // Setup event listeners
        setupEventListeners();
      })
      .catch(function (error) {
        console.error('Error loading data:', error);
        showErrorMessage('Failed to load chess games data. Please try again later.');
      });
  }

  // Initialize filter dropdowns with data-driven options
  function initializeFilters(data) {
    // Populate opening filter
    const openings = preprocess.getAllOpeningNames(data);
    populateDropdown('#opening-filter', openings, 'all', 'Toutes');

    // Populate time control filter based on available time controls
    const timeControls = preprocess.getTimeControlOptions(data);
    populateDropdown('#time-control-filter', timeControls, 'all', 'Tous');

    // Elo ranges could be generated based on data min/max
    initializeEloFilter(data)
  }

  // Initialize elo range filter
  function initializeEloFilter (data) {
    const eloRanges = preprocess.getEloRange(data);
    const step = 100;

    const minSelect = document.getElementById('elo-min');
    const maxSelect = document.getElementById('elo-max');

    // Génère les options par pas de 100
    function populateEloSelect(select, min, max) {
      for (let i = min; i <= max; i += step) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        select.appendChild(option);
      }
    }

    populateEloSelect(minSelect, eloRanges.min, eloRanges.max - step);
    populateEloSelect(maxSelect, eloRanges.min + step, eloRanges.max);

    // Met valeur initiale
    minSelect.value = eloRanges.min;
    maxSelect.value = eloRanges.max;

    // Empêche de sélectionner un max inférieur au min
    minSelect.addEventListener('change', () => {
      const minVal = parseInt(minSelect.value);
      const maxVal = parseInt(maxSelect.value);
      if (minVal >= maxVal) {
        maxSelect.value = Math.min(minVal + step, eloRanges.max);
      }
    });

    maxSelect.addEventListener('change', () => {
      const minVal = parseInt(minSelect.value);
      const maxVal = parseInt(maxSelect.value);
      if (maxVal <= minVal) {
        minSelect.value = Math.max(maxVal - step, eloRanges.min);
      }
    });
  }

  // Helper function to populate dropdown with options
  function populateDropdown(selector, options, defaultValue, defaultText) {
    const dropdown = d3.select(selector);
    
    // Keep the default option
    const defaultOption = dropdown.select('option');
    
    // Clear existing options (except the default)
    dropdown.selectAll('option:not(:first-child)').remove();
    
    // Add new options
    dropdown.selectAll('option:not(:first-child)')
      .data(options)
      .enter()
      .append('option')
      .attr('value', d => d)
      .text(d => d);
  }

  // Draw all visualizations based on current state
  function drawVisualizations(data) {
    // Apply filters to data
    const filteredData = applyFilters(data);
    
    // Draw each visualization with filtered data
    viz1.drawViz(filteredData, svgSize, margin, graphSize);
    viz2.drawViz(filteredData, svgSize, margin, graphSize);
    viz3.drawViz(filteredData, svgSize, margin, graphSize);
    viz4.drawViz(filteredData, svgSize, margin, graphSize);
    viz5.drawViz(filteredData, svgSize, margin, graphSize);
  }
  
  // Apply all filters to the dataset
  function applyFilters(data) {
    return data.filter(d => {
      // Opening filter
      if (state.filters.opening !== 'all') {
        const opening = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
        if (opening !== state.filters.opening) return false;
      }
      
      // Game type filter (rated/casual)
      if (state.filters.gameType !== 'all') {
        const isRated = state.filters.gameType === 'rated';
        if (d.rated !== isRated) return false;
      }
      
      // Time control filter
      if (state.filters.timeControl !== 'all') {
        const timeControl = d.time_control || d.estimated_time_control;
        if (timeControl !== state.filters.timeControl) return false;
      }
      
      // Search filter (if any)
      if (state.filters.search) {
        const searchTerm = state.filters.search.toLowerCase();
        const openingName = d.opening_name.toLowerCase();
        if (!openingName.includes(searchTerm)) return false;
      }
      
      // If all filters pass, keep the data point
      return true;
    });
  }

  // Setup all event listeners
  function setupEventListeners() {
    // Filter button click
    d3.select('#filter-button').on('click', function() {
      updateFilters();
      redrawVisualizations();
    });
    
    // Search button click
    d3.select('#search-button').on('click', function() {
      state.filters.search = d3.select('#search-input').property('value');
      redrawVisualizations();
    });
    
    // Search input enter key
    d3.select('#search-input').on('keyup', function(event) {
      if (event.key === 'Enter') {
        state.filters.search = this.value;
        redrawVisualizations();
      }
    });
  }
  
  // Update filters from UI controls
  function updateFilters() {
    state.filters.opening = d3.select('#opening-filter').property('value');
    state.filters.elo = d3.select('#elo-filter').property('value');
    state.filters.color = d3.select('#color-filter').property('value');
    state.filters.gameType = d3.select('#game-type-filter').property('value');
    state.filters.timeControl = d3.select('#time-control-filter').property('value');
  }
  
  // Redraw all visualizations after filter changes
  function redrawVisualizations() {
    // Clear existing visualizations
    d3.selectAll('.graph svg').remove();
    
    // Draw with updated filters
    drawVisualizations(state.data);
  }
  
  // Show error message to user
  function showErrorMessage(message) {
    const main = d3.select('main');
    
    main.html(''); // Clear content
    
    main.append('div')
      .attr('class', 'error-message')
      .style('text-align', 'center')
      .style('padding', '50px')
      .style('color', 'red')
      .html(`<h3>Error</h3><p>${message}</p>`);
  }

  // Start the application
  init();
})(d3);