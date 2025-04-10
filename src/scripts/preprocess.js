// Return a list of all opening names without the variations
export function getAllOpeningNames (data) {
    const cleanNames = data.map(d => {
        return d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
    });

    return [...new Set(cleanNames)];
}

// Returns the n most popular openings in the dataset
export function getTopNOpenings (data, n) {
    const openings = data.reduce((acc, d) => {
        const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});

    const sortedOpenings = Object.entries(openings).sort((a, b) => b[1] - a[1]);
    return sortedOpenings.slice(0, n);
}

// Returns the n most popular openings with win percentages
export function getTopNOpeningsWinners(data, n) {
    const openings = {};

    data.forEach(d => {
        const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');

        if (!openings[name]) {
            openings[name] = { total: 0, whiteWins: 0, blackWins: 0, draws: 0 };
        }

        openings[name].total++;
        if (d.winner === "white") openings[name].whiteWins++;
        if (d.winner === "black") openings[name].blackWins++;
        if (d.winner === "draw") openings[name].draws++;
    });

    const sortedOpenings = Object.entries(openings)
        .map(([name, stats]) => ({
            name,
            total: stats.total,
            whiteWinPct: (stats.whiteWins / stats.total) * 100,
            blackWinPct: (stats.blackWins / stats.total) * 100,
            drawPct: (stats.draws / stats.total) * 100
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, n);

    return sortedOpenings;
}

// Returns the n most popular openings with their victory status percentages
export function getTopNOpeningsWithResults(data, n) {
    const openings = {};

    data.forEach(d => {
        const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');

        if (!openings[name]) {
            openings[name] = { total: 0, mate: 0, resign: 0, outoftime: 0, draw: 0 };
        }

        openings[name].total++;
        if (d.victory_status === "mate") openings[name].mate++;
        else if (d.victory_status === "resign") openings[name].resign++;
        else if (d.victory_status === "outoftime") openings[name].outoftime++;
        else if (d.victory_status === "draw") openings[name].draw++;
    });

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
        .slice(0, n);

    return sortedOpenings;
}

// Returns thhe n most popular opening with their win percentage per elo
export function getWinRateByOpeningAcrossEloRanges(data, n) {
    const openingCounts = {};
    data.forEach(d => {
        const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
        openingCounts[name] = (openingCounts[name] || 0) + 1;
    });

    const topOpenings = new Set(
        Object.entries(openingCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([name]) => name)
    );

    const filteredData = data.filter(d =>
        topOpenings.has(d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, ''))
    );

    const elos = filteredData.flatMap(d => [(d.white_rating + d.black_rating) / 2]);
    const minElo = Math.floor(Math.min(...elos) / 100) * 100;
    const maxElo = Math.ceil(Math.max(...elos) / 100) * 100;

    const results = {};

    for (let elo = minElo; elo < maxElo; elo += 100) {
        const rangeKey = `${elo}-${elo + 99}`;
        results[rangeKey] = {};

        const rangeFilteredData = filteredData.filter(d => {
            const averageRating = (d.white_rating + d.black_rating) / 2;
            return averageRating >= elo && averageRating <= elo + 99;
        });

        rangeFilteredData.forEach(d => {
            const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');

            if (!results[rangeKey][name]) {
                results[rangeKey][name] = { total: 0, whiteWins: 0, blackWins: 0, draws: 0 };
            }

            results[rangeKey][name].total++;
            if (d.winner === "white") results[rangeKey][name].whiteWins++;
            if (d.winner === "black") results[rangeKey][name].blackWins++;
            if (d.winner === "draw") results[rangeKey][name].draws++;
        });
    }

    return Object.entries(results).map(([range, openings]) => ({
        range,
        openings: Array.from(topOpenings).map(name => {
            const stats = openings[name] || { total: 0, whiteWins: 0, blackWins: 0, draws: 0 };
            return {
                name,
                total: stats.total,
                whiteWinPct: stats.total ? (stats.whiteWins / stats.total) * 100 : 0,
                blackWinPct: stats.total ? (stats.blackWins / stats.total) * 100 : 0,
                drawPct: stats.total ? (stats.draws / stats.total) * 100 : 0
            };
        })
    }));
}


export function getNOpeningVariations(data, n) {

    const openings = data.reduce((acc, d) => {
        const parts = d.opening_name.split(/[:|]/);
        const name = parts[0].trim().replace(/#\d+$/, '');
        const variation = parts[1] ? parts[1].trim() : null;

        if (!acc[name]) {
            acc[name] = { count: 0, variations: {} };
        }
        
        acc[name].count += 1;
        
        if (variation) {
            const cleanedVariation = variation.replace(/\bvariation\b/gi, '').trim();
            
            if (!acc[name].variations[cleanedVariation]) {
                acc[name].variations[cleanedVariation] = 0;
            }
            acc[name].variations[cleanedVariation] += 1;
        }
        return acc;
    }, {});

    const sortedOpenings = Object.entries(openings)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, n);

    return sortedOpenings.reduce((acc, [name, details]) => {
        acc[name] = details;
        return acc;
    }, {});
}

export function getOpeningStats (data) {
    const openings = {};

    data.forEach(d => {
        const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
        const ply = d.opening_ply;
        const turns = d.turns;

        if (!openings[name]) {
            openings[name] = {
                total: 0,
                totalTurns: 0,
                totalPly: 0,
                whiteWins: 0,
                blackWins: 0,
                draws: 0
            };
        }

        openings[name].total++;
        openings[name].totalTurns += turns;
        openings[name].totalPly += ply;

        if (d.winner === "white") openings[name].whiteWins++;
        else if (d.winner === "black") openings[name].blackWins++;
        else if (d.winner === "draw") openings[name].draws++;
    });

    return Object.entries(openings).map(([name, stats]) => ({
        name,
        averageTurns: stats.total ? stats.totalTurns / stats.total : 0,
        averagePly: stats.total ? stats.totalPly / stats.total : 0,
        whiteWinPct: stats.total ? (stats.whiteWins / stats.total) * 100 : 0,
        blackWinPct: stats.total ? (stats.blackWins / stats.total) * 100 : 0,
        drawPct: stats.total ? (stats.draws / stats.total) * 100 : 0
    })).sort((a, b) => b.total - a.total);
}

// Get time control options from data
export function getTimeControlOptions(data) {
    if (data[0] && data[0].time_control) {
        return [...new Set(data.map(d => d.time_control))];
    }
    
    const processedData = data.map(d => {
        let totalTimeSeconds = 0;
        let timeControlCategory = 'Non défini';
        
        if (d.created_at && d.last_move_at) {
            const startTime = new Date(d.created_at);
            const endTime = new Date(d.last_move_at);
            totalTimeSeconds = (endTime - startTime) / 1000;
            
            const numMoves = d.turns || 40;
            const averageTimePerMove = totalTimeSeconds / numMoves;
            
            if (averageTimePerMove <= 3) {
                timeControlCategory = 'Bullet';
            } else if (averageTimePerMove <= 10) {
                timeControlCategory = 'Blitz';
            } else if (averageTimePerMove <= 30) {
                timeControlCategory = 'Rapide';
            } else {
                timeControlCategory = 'Classique';
            }
        }
        
        return {
            ...d,
            estimated_time_control: timeControlCategory
        };
    });
    
    return [...new Set(processedData.map(d => d.estimated_time_control))];
}

// De plus, modifions la fonction getOpeningUsageByElo pour utiliser cette estimation
export function getOpeningUsageByElo(data, n, filterType = null, timeControl = null, colorFilter = 'both', sortBy = 'popularity') {
    // Normaliser les données pour garantir que rated est un booléen
    const processedData = data.map(d => {
        // Convertir rated en booléen (peut être une chaîne "true"/"false" dans le CSV)
        const ratedValue = typeof d.rated === 'string' 
            ? d.rated.toLowerCase() === 'true' 
            : !!d.rated;
            
        if (d.time_control) {
            return {
                ...d,
                rated: ratedValue
            };
        }
        
        let timeControlCategory = 'Non défini';
        
        if (d.created_at && d.last_move_at) {
            const startTime = new Date(d.created_at);
            const endTime = new Date(d.last_move_at);
            const totalTimeSeconds = (endTime - startTime) / 1000;
            
            const numMoves = d.turns || 40;
            const averageTimePerMove = totalTimeSeconds / numMoves;
            
            if (averageTimePerMove <= 3) {
                timeControlCategory = 'Bullet';
            } else if (averageTimePerMove <= 10) {
                timeControlCategory = 'Blitz';
            } else if (averageTimePerMove <= 30) {
                timeControlCategory = 'Rapide';
            } else {
                timeControlCategory = 'Classique';
            }
        }
        
        return {
            ...d,
            rated: ratedValue,
            estimated_time_control: timeControlCategory
        };
    });
    
    // Debug pour vérifier les valeurs de rated
    console.log('Filter type:', filterType);
    console.log('Example rated values:', processedData.slice(0, 5).map(d => d.rated));
    
    const openingCounts = {};
    processedData.forEach(d => {
        const effectiveTimeControl = d.time_control || d.estimated_time_control;
        
        // Vérifier si la partie correspond aux filtres
        if ((filterType !== null && d.rated !== filterType) || 
            (timeControl !== null && effectiveTimeControl !== timeControl)) {
            return;
        }
        
        const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
        openingCounts[name] = (openingCounts[name] || 0) + 1;
    });

    let topOpenings;
    
    if (sortBy === 'popularity') {
        topOpenings = Object.entries(openingCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([name]) => name);
    } else if (sortBy === 'name') {
        topOpenings = Object.entries(openingCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(0, n)
            .map(([name]) => name);
    }
    
    if (!topOpenings || topOpenings.length === 0) {
        console.log('No openings found with the current filters');
        return {
            data: [],
            openings: [],
            eloRanges: []
        };
    }

    const filteredData = processedData.filter(d => {
        const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
        const effectiveTimeControl = d.time_control || d.estimated_time_control;
        
        // Appliquer les filtres
        if ((filterType !== null && d.rated !== filterType) || 
            (timeControl !== null && effectiveTimeControl !== timeControl)) {
            return false;
        }
        
        return topOpenings.includes(name);
    });
    
    if (filteredData.length === 0) {
        console.log('No data found with the current filters');
        return {
            data: [],
            openings: [],
            eloRanges: []
        };
    }

    const elos = filteredData.flatMap(d => [d.white_rating, d.black_rating]);
    const minElo = Math.floor(Math.min(...elos) / 100) * 100;
    const maxElo = Math.ceil(Math.max(...elos) / 100) * 100;

    const heatmapData = [];
    const eloRanges = [];

    for (let elo = minElo; elo < maxElo; elo += 100) {
        const rangeKey = `${elo}-${elo + 99}`;
        eloRanges.push(rangeKey);
        
        for (const opening of topOpenings) {
            let whiteGames = 0;
            let blackGames = 0;
            
            if (colorFilter === 'both' || colorFilter === 'white') {
                whiteGames = filteredData.filter(d => {
                    return d.white_rating >= elo && 
                           d.white_rating < elo + 100 && 
                           d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '') === opening;
                }).length;
            }
            
            if (colorFilter === 'both' || colorFilter === 'black') {
                blackGames = filteredData.filter(d => {
                    return d.black_rating >= elo && 
                           d.black_rating < elo + 100 && 
                           d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '') === opening;
                }).length;
            }
            
            heatmapData.push({
                eloRange: rangeKey,
                opening: opening,
                count: whiteGames + blackGames,
                whiteCount: whiteGames,
                blackCount: blackGames
            });
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
    console.log(`min Elo ${minElo}, max Elo ${maxElo}`)
    return { "min": minElo, "max": maxElo }
}


