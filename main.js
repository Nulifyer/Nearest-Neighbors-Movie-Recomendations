const fs = require('fs');
const { title } = require('process');
const data = JSON.parse(fs.readFileSync('./ratings.json', 'utf8'));
const ratings = data.users;

//#region Prototypes

Array.prototype.sample = function (n) {
    const indexes = this.map((_, i) => i);
    return new Array(n)
        .fill(x => undefined)
        .map(() => this[(indexes.splice(Math.random() * indexes.length, 1)[0])]);
}
Array.prototype.groupBy = function (keyFunc) {
    if (typeof (keyFunc) !== 'function')
        throw 'keyFunc must be a function';
    return this.reduce((a, v) => {
        const k = keyFunc(v);
        if (a[k] === undefined)
            a[k] = [];
        a[k].push(v);
        return a;
    }, {});
}
Array.prototype.distinct = function (keyFunc) {
    if (keyFunc === undefined)
        return Array.from(new Set(this));
    if (typeof (keyFunc) !== 'function')
        throw 'keyFunc must be a function';
    return this.reduce((a, v) => {
        const k = keyFunc(v);
        if (a[k] === undefined)
            a[k] = v;
        return a;
    }, {});
}
Array.prototype.toDictionary = function (keyFunc, valFunc) {
    if (typeof (keyFunc) !== 'function')
        throw 'keyFunc must be a function';
    if (typeof (valFunc) !== 'function')
        throw 'valFunc must be a function';
    return this.reduce((a, v) => {
        const kf = keyFunc(v);
        const vf = valFunc(v);
        a[kf] = vf;
        return a;
    }, {});
}

//#endregion

const lookup = ratings.toDictionary(x => x.name, x => x);
const titles = Object.keys(ratings[0]).filter(x => !(['name', 'timestamp']).includes(x));

// Create a ratings array for each user
ratings.forEach(r => r.ratings = titles.map(x => (!isNaN(r[x]) ? r[x] : undefined)));

function euclideanDistance(a, b) {
    if (a.length != b.length)
        throw 'Error A and B must be same length';
    const sum = a
        .filter((x, i) => !isNaN(x) && !isNaN(b[i]))
        .map((x, i) => Math.pow(b[i] - x, 2))
        .reduce((s, v) => s += v, 0);
    return Math.sqrt(sum);
}
function similarity(a, b) {
    return 1 / (euclideanDistance(a, b) + 1);
}

// Find how similar A is to B
(function () {
    console.log('--- Random Compare ---');

    // Get two different random users
    let [a, b] = ratings.sample(2);
    console.log(`A: ${a.name} <> B: ${b.name} = ${similarity(a.ratings, b.ratings)}`);
})();

// Find most similar to A
(function () {
    console.log('--- Top K Search ---');

    // Get random users
    const [a] = ratings.sample(1);

    const k = 5;
    const top_k = ratings
        .map(x => ({
            name: x.name,
            ratings: x.ratings,
            similarity: similarity(a.ratings, x.ratings)
        }))
        // sort most to least similar
        .sort((a, b) => b.similarity - a.similarity)
        // take top k
        .splice(0, k);

    console.log(`A: ${a.name} [${a.ratings}]`);
    console.log('Top K:');
    for (const k of top_k) {
        console.log(`${k.name}: ${k.similarity}`, k.ratings);
    }
})();

// Find most similar to incomplete rating
(function () {
    console.log('--- Recomendation ---');

    const input = {
        "I": 1,
        "II": 1,
        "III": 2,
        "IV": 4,
        "V": 5,
        "VI": 3,
        "VII": 4,
    }
    const input_rating = titles.map(x => (!isNaN(input[x]) ? input[x] : undefined));

    const k = 5;
    const top_k = ratings
        .map(x => ({
            name: x.name,
            ratings: x.ratings,
            similarity: similarity(input_rating, x.ratings)
        }))
        // sort most to least similar
        .sort((a, b) => b.similarity - a.similarity)
        // take top k
        .splice(0, k);

    const avg_top_k = titles
        // list of rating indexes
        .map((x, i) => i)
        .map(i => {
            // get sum of rating index with value
            const idx_ratings = top_k
                .map(k => isNaN(k.ratings[i])
                    ? k.ratings[i]
                    : k.ratings[i] * k.similarity)
                .filter(r => !isNaN(r))
            // rating sum weighed on similarity
            const weightedSum = idx_ratings
                .reduce((a, v) => a += v, .0);
            // get sum of similiarity
            const similaritySum = top_k
                .map(k => k.similarity)
                .reduce((a, v) => a += v, .0);
            // return average
            return weightedSum / similaritySum;
        });

    console.log(input_rating);
    console.log('Avg:', avg_top_k);
    console.log('Top K:');
    for (const k of top_k) {
        console.log(`${k.name}: ${k.similarity}`, k.ratings);
    }
    const predictions = titles
        .reduce((a, v, i) => {
            a[v] = avg_top_k[i];
            return a;
        }, {});
    Object.keys(input)
        .forEach(x => delete predictions[x])
    console.log('Predictions:', predictions);
})();