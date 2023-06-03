const { promptMatcher } = require('./config.json');
const dayjs = require('dayjs');
const reviewDecks = require('./prompts.json');

module.exports = {
    completedPrompt(review, deck) {
        var prompt = reviewDecks[deck][review.index];
        const promptSplit = prompt.prompt.split(promptMatcher);
        var completion = "";
        
        for(var i = 0; i < promptSplit.length; i++) {
            completion += promptSplit[i];
            if(i != promptSplit.length - 1) {
                completion += prompt.hint;
            }
        }

        return completion;
    },

    correctedPrompt(review, deck) {
        var prompt = reviewDecks[deck][review.index];
        const promptSplit = prompt.prompt.split(promptMatcher);
        console.debug(promptSplit.length);
        var completion = "";

        for(var i = 0; i < promptSplit.length; i++) {
            completion += promptSplit[i];
            if(i != promptSplit.length - 1) {
                completion += prompt.answer[0];
            }
        }
        return completion;
    },

    translatedPrompt(review, deck) {
        var prompt = reviewDecks[deck][review.index];
        if(typeof(prompt.translated_prompt) == "undefined") {
            return "";
        }
        return prompt.translated_prompt;
    },

    addSpacedRange(level) {
        dayTime = dayjs();
        
        switch(level) {
            case 0:
                dayTime = dayTime.add(4, 'h'); 
                break;
            case 1:
                dayTime = dayTime.add(8, 'h');
                break;
            case 3:
                dayTime = dayTime.add(1, 'd');
                break;
            case 4:
                dayTime = dayTime.add(2, 'd');
                break;
            case 5:
                dayTime = dayTime.add(1, 'w');
                break;
            case 6:
                dayTime = dayTime.add(2, 'w');
                break;
            default:
                dayTime = dayTime.add(Math.pow(level - 7, 2), 'M');
        }

        return dayTime;
    },

    updateReviewLevel(review) {
        if(review.timesWrong == 0) {
            review.level++;
        }

        review.level = review.level - (Math.ceil(review.timesWrong / 2) * (review.level >= 5 ? 2 : 1));
        if(review.level < 0) {
            review.level = 0;
        }

        console.log(`review ${review.index} set to ${review.level}`);
    },

    updateReviewTime(review) {
        review.nextReviewTime = this.addSpacedRange(review.level).unix();
        console.log(`review ${review.index} time set to ${review.nextReviewTime}`);
    },

    isGuessCorrect(review, deck, guess) {
        var prompt = reviewDecks[deck][review.index];
        return prompt.answer.includes(guess);
    },

    getReviewAnswer(review, deck) {
        var prompt = reviewDecks[deck][review.index];
        return prompt.answer[0];
    }
}