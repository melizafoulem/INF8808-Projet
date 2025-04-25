/**
 * Filter module for the chess openings visualization
 * Handles all filter-related functionality across visualizations
 */

// Store current filter state
let filterState = {
  opening: 'all',
  elo: 'all',
  color: 'both',
  gameType: 'all',
  timeControl: 'all',
  search: '',
  sortBy: 'popularity' // Default sorting method
}

/**
 * Initialize filters with data-driven options
 *
 * @param {object} data - The chess games dataset
 * @param {Function} redrawCallback - Function to call when filters change
 */
export function initializeFilters (data, redrawCallback) {
  populateOpeningFilter(data)
  populateTimeControlFilter(data)
  setupEventListeners(redrawCallback)
}

/**
 * Populate opening filter dropdown
 *
 * @param {object} data - The chess games dataset
 */
function populateOpeningFilter (data) {
  const openings = getAllOpenings(data)
  const dropdown = document.querySelector('#opening-filter')

  // Clear existing options except default
  while (dropdown.options.length > 1) {
    dropdown.options.remove(1)
  }

  // Add top openings as options
  openings.forEach(opening => {
    const option = document.createElement('option')
    option.value = opening
    option.textContent = opening
    dropdown.appendChild(option)
  })
}

/**
 * Populate time control filter dropdown
 *
 * @param {object} data - The chess games dataset
 */
function populateTimeControlFilter (data) {
  // Get unique time controls from data
  const timeControls = getUniqueTimeControls(data)
  const dropdown = document.querySelector('#time-control-filter')

  // Keep the default option
  const defaultOption = dropdown.options[0]

  // Clear existing options except default
  while (dropdown.options.length > 1) {
    dropdown.options.remove(1)
  }

  // Add time controls as options
  timeControls.forEach(timeControl => {
    const option = document.createElement('option')
    option.value = timeControl
    option.textContent = timeControl
    dropdown.appendChild(option)
  })
}

/**
 * Get all unique openings from the dataset
 *
 * @param {object} data - The chess games dataset
 * @returns {Array} - Array of unique opening names
 */
function getAllOpenings (data) {
  const allOpenings = data.map(d => {
    return d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '')
  })

  return [...new Set(allOpenings)].sort()
}

/**
 * Get all unique time controls from the dataset
 *
 * @param {object} data - The chess games dataset
 * @returns {Array} - Array of unique time control options
 */
function getUniqueTimeControls (data) {
  // Handle cases where time_control might be missing
  const timeControls = data
    .map(d => d.time_control || d.estimated_time_control || 'Non défini')
    .filter(Boolean) // Remove any undefined values

  return [...new Set(timeControls)].sort()
}

/**
 * Setup event listeners for filter controls
 *
 * @param {Function} redrawCallback - Function to call when filters change
 */
function setupEventListeners (redrawCallback) {
  // Filter button click
  document.querySelector('#filter-button').addEventListener('click', () => {
    updateFilterState()
    redrawCallback(filterState)
  })

  // Search functionality
  document.querySelector('#search-button').addEventListener('click', () => {
    filterState.search = document.querySelector('#search-input').value
    redrawCallback(filterState)
  })

  // Search on Enter key
  document.querySelector('#search-input').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      filterState.search = event.target.value
      redrawCallback(filterState)
    }
  })
}

/**
 * Update filter state from UI controls
 */
function updateFilterState () {
  filterState.opening = document.querySelector('#opening-filter').value
  filterState.elo = document.querySelector('#elo-filter').value
  filterState.color = document.querySelector('#color-filter').value
  filterState.gameType = document.querySelector('#game-type-filter').value
  filterState.timeControl = document.querySelector('#time-control-filter').value
}

/**
 * Apply all filters to the dataset
 *
 * @param {object} data - The chess games dataset
 * @returns {object} - Filtered dataset
 */
export function applyFilters (data) {
  return data.filter(d => {
    // Opening filter
    if (filterState.opening !== 'all') {
      const opening = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '')
      if (opening !== filterState.opening) return false
    }

    // Game type filter (rated/casual)
    if (filterState.gameType !== 'all') {
      const isRated = filterState.gameType === 'rated'
      if (d.rated !== isRated) return false
    }

    // Time control filter
    if (filterState.timeControl !== 'all') {
      const timeControl = d.time_control || d.estimated_time_control
      if (timeControl !== filterState.timeControl) return false
    }

    // Color filter
    if (filterState.color !== 'both') {
      // This would need specific handling based on how color is represented in your data
      // This is a placeholder for the implementation
    }

    // Search filter (if any)
    if (filterState.search) {
      const searchTerm = filterState.search.toLowerCase()
      const openingName = d.opening_name.toLowerCase()
      if (!openingName.includes(searchTerm)) return false
    }

    // If all filters pass, keep the data point
    return true
  })
}

/**
 * Get the current filter state
 *
 * @returns {object} - Current filter state
 */
export function getFilterState () {
  return { ...filterState }
}

/**
 * Update filter state directly
 *
 * @param {object} newState - New filter state
 */
export function updateFilters (newState) {
  filterState = { ...filterState, ...newState }
}
