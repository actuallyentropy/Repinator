const Review = require('./Review.js');
const ReviewUtilities = require('./ReviewUtilities.js');

class ReviewContext {
    constructor(user, deck, reviewsRightPerSave) {
        this.user = user;
        this.deck = deck;
        this.reviewQueue = [];
        this.reviewAgain = [];
        this.reviewIndex = 0;
        this.reviewsRightPerSave = reviewsRightPerSave;
        this.reviewsTillSync = reviewsRightPerSave;
        this.syncWhenPossible = false;
        this.complete = false;
        this.isLesson = false;
    }

    addStaticReview(index) {
        console.log(`creating review for ${index}`);
        this.reviewQueue.push(new Review({index: index, level: 0, isDynamicDeck: false}));
    }

    get currentReviewPrompt() {
        return ReviewUtilities.completedPrompt(this.reviewQueue[this.reviewIndex], this.deck);
    }

    get currentReviewTranslatedPrompt() {
        return ReviewUtilities.translatedPrompt(this.reviewQueue[this.reviewIndex], this.deck);
    }

    get currentReviewAnswer() {
        return ReviewUtilities.getReviewAnswer(this.reviewQueue[this.reviewIndex], this.deck);
    }

    get currentLessonText() {
        return ReviewUtilities.getLessonText(this.reviewQueue[this.reviewIndex], this.deck);
    }

    getCurrentReviewMessage({isCorrection = false, currReview}) {
        var ans = ``;
        
        if(isCorrection) {
            ans += `Last review marked as correct! \n`;
        }else if(typeof(this.lastReview) != "undefined"){
            const correctedPrompt = ReviewUtilities.correctedPrompt(currReview, this.deck);
            const translatedPrompt = ReviewUtilities.translatedPrompt(currReview, this.deck);
            ans += `${correctedPrompt} ${this.lastReview.wasCorrect ? ':white_check_mark:' : ':x:'}\n${translatedPrompt != "" ? translatedPrompt + "\n" : ""}`;
        }

        ans += `\n`;
        
        if(this.reviewIndex >= this.reviewQueue.length) {
            ans += "All done!";
            return ans;
        }

        const nextCompletedPrompt = ReviewUtilities.completedPrompt(this.reviewQueue[this.reviewIndex], this.deck);
        const nextTranslatedPrompt = ReviewUtilities.translatedPrompt(this.reviewQueue[this.reviewIndex], this.deck);

        ans += `${nextCompletedPrompt}`;
        if(nextTranslatedPrompt != "") {
            ans += `\n${nextTranslatedPrompt}`;
        }
        if(this.isLesson) {
            ans += `\n(answer: ${this.currentReviewAnswer})\n(use /guess with the answer to complete!)`;
            var ltxt = this.currentLessonText;
            if(ltxt != "") {
                ans += `\n\n${ltxt}`
            }
        }

        return ans;
    }

    shuffleReviewQueue() {
        this.reviewQueue.sort((a, b) => 0.5 - Math.random());
    }

    refreshReviewQueue() {
        this.reviewQueue = [];
            
        while(this.reviewAgain.length > 0) {
            this.reviewQueue.push(this.reviewAgain.pop());
        }

        if(!this.isLesson) {
            this.shuffleReviewQueue();
        }
        this.reviewIndex = 0;

        if(this.reviewQueue.length == 0) {
            this.complete = true;
            this.syncWhenPossible = true;
        }
    }

    correctLastReview() {
        if(typeof(this.lastReview) == "undefined") {
            return "It looks like you haven't done any reviews yet!";
        } else if(this.lastReview.wasCorrect) {
            return "It looks like your last review was already marked correct!";
        }

        this.reviewAgain.pop();
        this.lastReview.wasCorrect = true;
        this.lastReview.review.timesWrong--;
        this.reviewsTillSync--;
        if(this.reviewsTillSync <= 0) {
            this.reviewsTillSync = this.reviewsRightPerSave;
            this.syncWhenPossible = true;
        }
        ReviewUtilities.updateReviewLevel(this.lastReview.review);
        ReviewUtilities.updateReviewTime(this.lastReview.review);
        this.lastReview.review.timesWrong = 0;

        if(this.reviewQueue[this.reviewIndex] == this.lastReview.review) {
            this.reviewIndex++;
        }

        if(this.reviewIndex >= this.reviewQueue.length) {
            this.refreshReviewQueue();
        }
        return this.getCurrentReviewMessage({isCorrection: true});
    }

    guessReview(guess) {
        guess = guess.trim();

        if(this.reviewIndex < 0 || this.reviewIndex >= this.reviewQueue.length) {
            if(this.reviewAgain.length == 0)
                return "No more reviews!";
            return "Something went wrong!";
        }

        var currReview = this.reviewQueue[this.reviewIndex];

        if(ReviewUtilities.isGuessCorrect(currReview, this.deck, guess)) {
            this.reviewsTillSync--;

            if(this.reviewsTillSync <= 0) {
                this.reviewsTillSync = this.reviewsRightPerSave;
                this.syncWhenPossible = true;
            }
            ReviewUtilities.updateReviewLevel(currReview);
            ReviewUtilities.updateReviewTime(currReview);
            currReview.timesWrong = 0;
        } else if(!this.isLesson) {
            currReview.timesWrong++;
            this.reviewAgain.push(currReview);
        }

        this.lastReview = {review: currReview, wasCorrect: ReviewUtilities.isGuessCorrect(currReview, this.deck, guess)};

        if(!(this.isLesson && !this.lastReview.wasCorrect)) {
            this.reviewIndex++;
        }

        if(this.reviewIndex >= this.reviewQueue.length) {
            this.refreshReviewQueue();
        }

        return this.getCurrentReviewMessage({currReview: currReview});
    }
}

module.exports = ReviewContext;