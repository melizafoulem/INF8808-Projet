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

    // Convert object to array and sort by popularity
    const sortedOpenings = Object.entries(openings)
        .map(([name, stats]) => ({
            name,
            total: stats.total,
            whiteWinPct: (stats.whiteWins / stats.total) * 100,
            blackWinPct: (stats.blackWins / stats.total) * 100,
            drawPct: (stats.draws / stats.total) * 100
        }))
        .sort((a, b) => b.total - a.total) // Sort by total games played
        .slice(0, n); // Keep top N

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

    // Convert object to array and sort by popularity
    const sortedOpenings = Object.entries(openings)
        .map(([name, stats]) => ({
            name,
            total: stats.total,
            matePct: (stats.mate / stats.total) * 100,
            resignPct: (stats.resign / stats.total) * 100,
            outoftimePct: (stats.outoftime / stats.total) * 100,
            drawPct: (stats.draw / stats.total) * 100
        }))
        .sort((a, b) => b.total - a.total) // Sort by total games played
        .slice(0, n); // Keep top N

    return sortedOpenings;
}