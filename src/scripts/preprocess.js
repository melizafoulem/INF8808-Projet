// Return a list of all opening names without the variations
export function getAllOpeningNames (data) {
    const cleanNames = data.map(d => {
        return d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
    });

    return [...new Set(cleanNames)];
}

// Returns the n most popular openings in the dataset
// export function getTopNOpenings (data, n) {
//     const openings = data.reduce((acc, d) => {
//         const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');
//         acc[name] = (acc[name] || 0) + 1;
//         return acc;
//     }, {});

//     const sortedOpenings = Object.entries(openings).sort((a, b) => b[1] - a[1]);
//     return sortedOpenings.slice(0, n);
// }

// Returns the n most popular openings with win percentages
export function getTopNOpenings(data, n) {
    const openings = {};

    data.forEach(d => {
        const name = d.opening_name.split(/[:|]/)[0].trim().replace(/#\d+$/, '');

        if (!openings[name]) {
            openings[name] = { total: 0, whiteWins: 0, blackWins: 0 };
        }

        openings[name].total++;
        if (d.winner === "white") openings[name].whiteWins++;
        if (d.winner === "black") openings[name].blackWins++;
    });

    // Convert object to array and sort by popularity
    const sortedOpenings = Object.entries(openings)
        .map(([name, stats]) => ({
            name,
            total: stats.total,
            whiteWinPct: (stats.whiteWins / stats.total) * 100,
            blackWinPct: (stats.blackWins / stats.total) * 100
        }))
        .sort((a, b) => b.total - a.total) // Sort by total games played
        .slice(0, n); // Keep top N

    return sortedOpenings;
}
