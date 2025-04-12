'use strict'

import * as helper from './src/scripts/helper.js';
import * as preprocess from './src/scripts/preprocess.js';
import * as viz1 from './src/scripts/viz1-heatmap/viz.js';
import * as viz2 from './src/scripts/viz2-stacked-bar/viz.js';
import * as viz3 from './src/scripts/viz3-line-chart/viz.js';
import * as viz4 from './src/scripts/viz4-circle-packing-diagram/viz.js';
import * as viz5 from './src/scripts/viz5-scatter-plot/viz.js';

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
      opening: [],
      elo: [],
      color: [],
      gameType: [],
      timeControl: [],
      search: ''
    }
  };

  // Initialize the application
  function init() {
    // Load data
    d3.csv('./games.csv', d3.autoType)
      .then(function (data) {
        state.data = data;
        
        // Estimate time par game
        estimateTimePerGame(data)

        // Initialize filter dropdowns
        initializeFilters(data);

        // Set filter selection
        updateFilters()
        
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

  function estimateTimePerGame(data) {
    data.forEach(d => {
      if (!d.increment_code || !d.increment_code.includes('+')) {
        d.estimated_time_control = 'Unknown';
        return;
      }

      const [initialStr, incrementStr] = d.increment_code.split('+');
      const initial = parseInt(initialStr);
      const increment = parseInt(incrementStr);

      const estimatedTime = initial * 60 + increment * d.turns;

      if (estimatedTime < 180) {
        d.estimated_time_control = 'Bullet';
      } else if (estimatedTime < 480) {
        d.estimated_time_control = 'Blitz';
      } else if (estimatedTime < 1500) {
        d.estimated_time_control = 'Rapide';
      } else {
        d.estimated_time_control = 'Classique';
      }
    })
  }

  // Initialize filter dropdowns with data-driven options
  function initializeFilters(data) {
    initializeOpeningFilter(data)
    initializeEloFilter(data)

    initializeCheckboxFilter({
      buttonId: 'color-dropdown-button',
      menuId: 'color-dropdown-menu',
      wrapperId: 'color-filter-wrapper',
      options: ['white', 'black'],
      valueLabels: { white: 'Blanc', black: 'Noir' }
    });
  
    initializeCheckboxFilter({
      buttonId: 'game-type-dropdown-button',
      menuId: 'game-type-dropdown-menu',
      wrapperId: 'game-type-filter-wrapper',
      options: ['rated', 'casual'],
      valueLabels: { rated: 'Classée', casual: 'Non classée' }
    });
  
    initializeCheckboxFilter({
      buttonId: 'time-control-dropdown-button',
      menuId: 'time-control-dropdown-menu',
      wrapperId: 'time-control-filter-wrapper',
      options: preprocess.getTimeControlOptions(data)
    });
  }

  function initializeCheckboxFilter({ buttonId, menuId, wrapperId, options, valueLabels }) {
    const button = document.getElementById(buttonId);
    const menu = document.getElementById(menuId);
    const wrapper = document.getElementById(wrapperId);
  
    document.addEventListener('click', (e) => {
      if (!e.target.closest(`#${wrapperId}`)) {
        menu.style.display = 'none';
      }
    });
  
    button.addEventListener('click', () => {
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
  
    menu.innerHTML = '';
    options.forEach(option => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="checkbox" value="${option}" class="${menuId}-checkbox" checked> 
        ${valueLabels?.[option] ?? option}
      `;
      menu.appendChild(label);
    });
  
    const checkboxes = () => document.querySelectorAll(`.${menuId}-checkbox`);
  
    function updateButtonText() {
      const selected = Array.from(checkboxes())
        .filter(cb => cb.checked)
        .map(cb => valueLabels?.[cb.value] ?? cb.value);
  
      if (selected.length === options.length) {
        button.textContent = selected.join(', ') + ' ▾';
      } else if (selected.length > 0) {
        button.textContent = selected.join(', ') + ' ▾';
      } else {
        button.textContent = 'Aucune sélection ▾';
      }
    }
  
    menu.addEventListener('change', updateButtonText);
    updateButtonText();
  }  

  function initializeOpeningFilter (data) {
    const openings = preprocess.getAllOpeningNames(data);

    const dropdownButton = document.getElementById('dropdown-button');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const checkboxContainer = document.getElementById('checkbox-options');
    const selectAllCheckbox = document.getElementById('select-all');

    dropdownButton.addEventListener('click', () => {
      dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-multiselect')) {
        dropdownMenu.style.display = 'none';
      }
    });

    function populateCheckboxes(openings) {
      checkboxContainer.innerHTML = '';
      openings.forEach(opening => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${opening}" class="opening-checkbox" checked> ${opening}`;
        checkboxContainer.appendChild(label);
      });
    }

    populateCheckboxes(openings);

    selectAllCheckbox.addEventListener('change', () => {
      const checked = selectAllCheckbox.checked;
      document.querySelectorAll('.opening-checkbox').forEach(cb => {
        cb.checked = checked;
      });
    });

    checkboxContainer.addEventListener('change', () => {
      const checkboxes = document.querySelectorAll('.opening-checkbox');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      selectAllCheckbox.checked = allChecked;
    });

    function getSelectedOpenings() {
      const checked = document.querySelectorAll('.opening-checkbox:checked');
      return Array.from(checked).map(cb => cb.value);
    }

    function updateButtonText() {
      const selected = getSelectedOpenings();
      if (selectAllCheckbox.checked) {
        dropdownButton.textContent = "Toutes les ouvertures ▾";
      } else if (selected.length > 0) {
        dropdownButton.textContent = `${selected.length} ouverture(s) sélectionnée(s) ▾`;
      } else {
        dropdownButton.textContent = "Choisir des ouvertures ▾";
      }
    }
    
    checkboxContainer.addEventListener('change', updateButtonText);
    selectAllCheckbox.addEventListener('change', updateButtonText);
    
    updateButtonText();
  }

  function initializeEloFilter (data) {
    const eloRanges = preprocess.getEloRange(data);
    const step = 100;

    const minSelect = document.getElementById('elo-min');
    const maxSelect = document.getElementById('elo-max');

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

    minSelect.value = eloRanges.min;
    maxSelect.value = eloRanges.max;

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

  // Draw all visualizations based on current state
  function drawVisualizations(data) {
    // Apply filters to data
    const filteredData = applyFilters(data);
    
    // Draw each visualization with filtered data
    viz1.drawSixHeatmaps(filteredData, svgSize, margin, graphSize);
    viz2.drawViz(filteredData, svgSize, margin, graphSize);
    viz3.drawViz(filteredData, svgSize, margin, graphSize);
    viz4.drawViz(filteredData, svgSize, margin, graphSize);
    viz5.drawViz(filteredData, svgSize, margin, graphSize);
  }
  
  // Apply all filters to the dataset
  function applyFilters(data) {
    return data.filter(d => {
      // Opening filter
      const opening = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '').trim();
      if (!state.filters.opening.includes(opening)) return false
      
      // Elo filter + Color filter
      const { white_rating, black_rating } = d;
      const { min, max } = state.filters.elo;
      const colors = state.filters.color;
      if (colors.includes('white') && (white_rating < min || white_rating > max)) return false;
      if (colors.includes('black') && (black_rating < min || black_rating > max)) return false;

      // Game type filter (rated/casual)
      const type = d.rated.toLowerCase() === 'true' ? 'rated' : 'casual';
      if (!state.filters.gameType.includes(type)) return false;
      
      // Time control filter
      if (!state.filters.timeControl.includes(d.estimated_time_control)) return false;
      
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
    // filter for openings
    const selectedOpenings = [];
    d3.selectAll('#checkbox-options input[type="checkbox"]:checked')
      .each(function() {
        if (this.value !== 'all') {
          selectedOpenings.push(this.value);
        }
      });
    state.filters.opening = selectedOpenings;

    // filter for elo
    const eloMin = d3.select('#elo-min').property('value');
    const eloMax = d3.select('#elo-max').property('value');
    state.filters.elo = { min: +eloMin, max: +eloMax };

    // filter for color
    state.filters.color = [];
    d3.selectAll('#color-dropdown-menu input[type="checkbox"]:checked')
      .each(function() {
        state.filters.color.push(this.value)
      });
    
    // filter for rated or unrated
    state.filters.gameType = []
    d3.selectAll('#game-type-dropdown-menu input[type="checkbox"]:checked')
      .each(function() {
        state.filters.gameType.push(this.value)
      });
    
    // filter for time control
    state.filters.timeControl = []
    d3.selectAll('#time-control-dropdown-menu input[type="checkbox"]:checked')
      .each(function() {
        state.filters.timeControl.push(this.value)
      });
  }
  
  // Redraw all visualizations after filter changes
  function redrawVisualizations() {
    // Clear existing visualizations
    d3.selectAll('.graph svg').remove();
    
    // Clear UI elements outside of SVG that need to be refreshed
    d3.selectAll('.legend').remove();
    d3.select('#viz2-pagination').remove();
    d3.select('#viz2-victory-pagination').remove();
    d3.select('#viz3-pagination').remove();

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