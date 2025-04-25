// Return a list of all opening names without the variations
/**
 * @param data
 */
export function getAllOpeningNames (data) {
  const cleanNames = data.map(d => {
    return d.opening_name
      .split(/[:|]/)[0]
      .replace(/#\d+$/, '')
      .trim()
  })

  return [...new Set(cleanNames)].sort((a, b) => a.localeCompare(b))
}

// Returns the n most popular openings in the dataset
/**
 * @param data
 * @param n
 */
export function getTopNOpenings (data, n) {
  const openings = data.reduce((acc, d) => {
    const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '')
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {})

  const sortedOpenings = Object.entries(openings).sort((a, b) => b[1] - a[1])
  return sortedOpenings.slice(0, n)
}

// Returns the n most popular openings with win percentages
/**
 * @param data
 * @param n
 */
export function getTopNOpeningsWinners (data, n) {
  const openings = {}

  data.forEach(d => {
    const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '')

    if (!openings[name]) {
      openings[name] = { total: 0, whiteWins: 0, blackWins: 0, draws: 0 }
    }

    openings[name].total++
    if (d.winner === 'white') openings[name].whiteWins++
    if (d.winner === 'black') openings[name].blackWins++
    if (d.winner === 'draw') openings[name].draws++
  })

  const sortedOpenings = Object.entries(openings)
    .map(([name, stats]) => ({
      name,
      total: stats.total,
      whiteWinPct: (stats.whiteWins / stats.total) * 100,
      blackWinPct: (stats.blackWins / stats.total) * 100,
      drawPct: (stats.draws / stats.total) * 100
    }))
    .sort((a, b) => b.total - a.total)

  return sortedOpenings
}

// Returns the n most popular openings with their victory status percentages
/**
 * @param data
 * @param n
 */
export function getTopNOpeningsWithResults (data, n) {
  const openings = {}

  data.forEach(d => {
    const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '')

    if (!openings[name]) {
      openings[name] = { total: 0, mate: 0, resign: 0, outoftime: 0, draw: 0 }
    }

    openings[name].total++
    if (d.victory_status === 'mate') openings[name].mate++
    else if (d.victory_status === 'resign') openings[name].resign++
    else if (d.victory_status === 'outoftime') openings[name].outoftime++
    else if (d.victory_status === 'draw') openings[name].draw++
  })

  const sortedOpenings = Object.entries(openings)
    .map(([name, stats]) => ({
      name,
      total: stats.total,
      matePct: (stats.mate / stats.total) * 100,
      resignPct: (stats.resign / stats.total) * 100,
      outoftimePct: (stats.outoftime / stats.total) * 100,
      drawPct: (stats.draw / stats.total) * 100
    }))
    .sort((a, b) => b.total - a.total)

  return sortedOpenings
}

// Returns thhe n most popular opening with their win percentage per elo
/**
 * @param data
 * @param n
 */
export function getWinRateByOpeningAcrossEloRanges (data, n) {
  const openingCounts = {}
  data.forEach(d => {
    const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '')
    openingCounts[name] = (openingCounts[name] || 0) + 1
  })

  const topOpenings = new Set(
    Object.entries(openingCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
  )

  const filteredData = data.filter(d =>
    topOpenings.has(d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, ''))
  )

  const elos = filteredData.flatMap(d => [(d.white_rating + d.black_rating) / 2])
  const minElo = Math.floor(Math.min(...elos) / 100) * 100
  const maxElo = Math.ceil(Math.max(...elos) / 100) * 100

  const results = {}

  for (let elo = minElo; elo < maxElo; elo += 100) {
    const rangeKey = `${elo}-${elo + 99}`
    results[rangeKey] = {}

    const rangeFilteredData = filteredData.filter(d => {
      const averageRating = (d.white_rating + d.black_rating) / 2
      return averageRating >= elo && averageRating <= elo + 99
    })

    rangeFilteredData.forEach(d => {
      const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '')

      if (!results[rangeKey][name]) {
        results[rangeKey][name] = { total: 0, whiteWins: 0, blackWins: 0, draws: 0 }
      }

      results[rangeKey][name].total++
      if (d.winner === 'white') results[rangeKey][name].whiteWins++
      if (d.winner === 'black') results[rangeKey][name].blackWins++
      if (d.winner === 'draw') results[rangeKey][name].draws++
    })
  }

  return Object.entries(results).map(([range, openings]) => ({
    range,
    openings: Array.from(topOpenings).map(name => {
      const stats = openings[name] || { total: 0, whiteWins: 0, blackWins: 0, draws: 0 }
      return {
        name,
        total: stats.total,
        whiteWinPct: stats.total ? (stats.whiteWins / stats.total) * 100 : 0,
        blackWinPct: stats.total ? (stats.blackWins / stats.total) * 100 : 0,
        drawPct: stats.total ? (stats.draws / stats.total) * 100 : 0
      }
    })
  }))
}

/**
 * @param data
 */
export function getNOpeningVariations (data) {
  const openings = data.reduce((acc, d) => {
    const parts = d.opening_name.split(/[:|]/)
    const name = parts[0].trim().replace(/#\d+$/, '').trim()
    const variation = parts[1] ? parts[1].trim() : null

    if (!acc[name]) {
      acc[name] = { count: 0, variations: {} }
    }

    acc[name].count += 1

    if (variation) {
      const cleanedVariation = variation.replace(/\bvariation\b/gi, '').trim()

      if (!acc[name].variations[cleanedVariation]) {
        acc[name].variations[cleanedVariation] = 0
      }
      acc[name].variations[cleanedVariation] += 1
    }
    return acc
  }, {})

  const sortedOpenings = Object.entries(openings)
    .sort((a, b) => b[1].count - a[1].count)

  return sortedOpenings.reduce((acc, [name, details]) => {
    acc[name] = details
    return acc
  }, {})
}

/**
 * @param data
 */
export function getOpeningStats (data) {
  const openings = {}

  data.forEach(d => {
    const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '')
    const ply = d.opening_ply
    const turns = d.turns

    if (!openings[name]) {
      openings[name] = {
        total: 0,
        totalTurns: 0,
        totalPly: 0,
        whiteWins: 0,
        blackWins: 0,
        draws: 0
      }
    }

    openings[name].total++
    openings[name].totalTurns += turns
    openings[name].totalPly += ply

    if (d.winner === 'white') openings[name].whiteWins++
    else if (d.winner === 'black') openings[name].blackWins++
    else if (d.winner === 'draw') openings[name].draws++
  })

  return Object.entries(openings).map(([name, stats]) => ({
    name,
    averageTurns: stats.total ? stats.totalTurns / stats.total : 0,
    averagePly: stats.total ? stats.totalPly / stats.total : 0,
    whiteWinPct: stats.total ? (stats.whiteWins / stats.total) * 100 : 0,
    blackWinPct: stats.total ? (stats.blackWins / stats.total) * 100 : 0,
    drawPct: stats.total ? (stats.draws / stats.total) * 100 : 0
  })).sort((a, b) => b.total - a.total)
}

// Get time control options from data
/**
 * @param data
 */
export function getTimeControlOptions (data) {
  if (data[0] && data[0].time_control) {
    return [...new Set(data.map(d => d.time_control))]
  }

  const processedData = data.map(d => {
    let totalTimeSeconds = 0
    let timeControlCategory = 'Non défini'

    if (d.created_at && d.last_move_at) {
      const startTime = new Date(d.created_at)
      const endTime = new Date(d.last_move_at)
      totalTimeSeconds = (endTime - startTime) / 1000

      const numMoves = d.turns || 40
      const averageTimePerMove = totalTimeSeconds / numMoves

      if (averageTimePerMove <= 3) {
        timeControlCategory = 'Bullet'
      } else if (averageTimePerMove <= 10) {
        timeControlCategory = 'Blitz'
      } else if (averageTimePerMove <= 30) {
        timeControlCategory = 'Rapide'
      } else {
        timeControlCategory = 'Classique'
      }
    }

    return {
      ...d,
      estimated_time_control: timeControlCategory
    }
  })

  return [...new Set(processedData.map(d => d.estimated_time_control))]
}

// De plus, modifions la fonction getOpeningUsageByElo pour utiliser cette estimation
export function getOpeningUsageByElo(data, filterType = null, timeControl = null, colorFilter = 'both', sortBy = 'popularity') {
    const filteredData = [];
    const openingCounts = {};

    for (const d of data) {
      const ratedValue = typeof d.rated === 'string'
        ? d.rated.toLowerCase() === 'true'
        : !!d.rated;
  
      const ratedType = ratedValue ? 'rated' : 'casual';
      const effectiveTimeControl = d.time_control || d.estimated_time_control;
      const opening = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
      
      let skipEntry = false;
      
      // Vérification du filtre rated/casual
      if (filterType !== null) {
        if (filterType === 'rated' && !ratedValue) skipEntry = true;
        if (filterType === 'casual' && ratedValue) skipEntry = true;
      }
      
      // Vérification du filtre de contrôle de temps
      if (!skipEntry && timeControl !== null && effectiveTimeControl !== timeControl) {
        skipEntry = true;
      }
      
      if (skipEntry) continue;
  
      filteredData.push({
        ...d,
        ratedType,
        effectiveTimeControl,
        cleanedOpening: opening,
      });
  
      openingCounts[opening] = (openingCounts[opening] || 0) + 1;
    }

  if (filteredData.length === 0) {
    return { data: [], openings: [], eloRanges: [] }
  }

  const topOpenings = Object.entries(openingCounts)
    .sort((a, b) => {
      if (sortBy === 'name') return a[0].localeCompare(b[0])
      return b[1] - a[1]
    })
    .map(([name]) => name)

  if (topOpenings.length === 0) {
    return { data: [], openings: [], eloRanges: [] }
  }

  const heatmapData = []
  const grouped = {}

  const elos = []

  for (const d of filteredData) {
    const opening = d.cleanedOpening
    if (!topOpenings.includes(opening)) continue

    const whiteElo = Math.floor(d.white_rating / 100) * 100
    const blackElo = Math.floor(d.black_rating / 100) * 100

    const whiteRange = `${whiteElo}-${whiteElo + 99}`
    const blackRange = `${blackElo}-${blackElo + 99}`

    elos.push(whiteElo, blackElo)

    if (!grouped[opening]) grouped[opening] = {}
    if (!grouped[opening][whiteRange]) grouped[opening][whiteRange] = { count: 0, whiteCount: 0, blackCount: 0 }
    if (!grouped[opening][blackRange]) grouped[opening][blackRange] = { count: 0, whiteCount: 0, blackCount: 0 }

    if (colorFilter === 'white' || colorFilter === 'both') {
      grouped[opening][whiteRange].count++
      grouped[opening][whiteRange].whiteCount++
    }
    if (colorFilter === 'black' || colorFilter === 'both') {
      grouped[opening][blackRange].count++
      grouped[opening][blackRange].blackCount++
    }
  }

  if (elos.length === 0) {
    return { data: [], openings: [], eloRanges: [] }
  }

  const minElo = Math.floor(Math.min(...elos) / 100) * 100
  const maxElo = Math.ceil(Math.max(...elos) / 100) * 100
  const eloRanges = []
  for (let elo = minElo; elo < maxElo; elo += 100) {
    eloRanges.push(`${elo}-${elo + 99}`)
  }

  for (const eloRange of eloRanges) {
    let totalCount = 0

    for (const opening of topOpenings) {
      const stats = grouped[opening]?.[eloRange] || { count: 0, whiteCount: 0, blackCount: 0 }
      totalCount += stats.count
    }

    for (const opening of topOpenings) {
      const stats = grouped[opening]?.[eloRange] || { count: 0, whiteCount: 0, blackCount: 0 }

      heatmapData.push({
        eloRange,
        opening,
        count: stats.count,
        whiteCount: stats.whiteCount,
        blackCount: stats.blackCount,
        relativeCount: totalCount > 0 ? (stats.count / totalCount) * 100 : 0
      })
    }
  }

  return {
    data: heatmapData,
    openings: topOpenings,
    eloRanges: eloRanges
  };
}
  

export function getEloRange(data) {
  const elos = data.flatMap(d => [d.white_rating, d.black_rating]);
  const minElo = Math.floor(Math.min(...elos) / 100) * 100;
  const maxElo = Math.ceil(Math.max(...elos) / 100) * 100;
  return { min: minElo, max: maxElo };
}
