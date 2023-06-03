const { promptMatcher } = require('./config.json');
const dayjs = require('dayjs');

class Review {
    constructor({index, level, isDynamicDeck}) {
        this.index = index;
        this.isDynamicDeck = isDynamicDeck;
        this.level = level;
        this.timesWrong = 0;
    }
}

module.exports = Review;