const ReviewContext = require('./ReviewContext.js');
const ReviewSequelizer = require('./ReviewSequelizer.js');
const reviewDecks = require('./prompts.json');
const dayjs = require('dayjs');
const { reviewsRightTillSync } = require('./config.json');
const { ActionRowBuilder, Events, StringSelectMenuBuilder } = require('discord.js');

class ReviewContextManager {
    static reviewContexts = {};
    static userRecords = {};
    static userActiveDecks = {};

    static async setActiveDeck(interaction) {
        ReviewSequelizer.setActiveDeck(interaction.user.id, interaction.values[0]);
        this.userActiveDecks[interaction.user.id] = interaction.values[0];
        await interaction.reply(`${interaction.user} Active deck set to ${interaction.values[0]}`);
    }

    static async loadAllActiveDecks() {
        const allDeckSettings = await ReviewSequelizer.DeckSettings.findAll();

        for(const activeDeck of allDeckSettings) {
            console.log(`setting active deck ${activeDeck.user},${activeDeck.activeDeck}`);
            this.userActiveDecks[activeDeck.user] = activeDeck.activeDeck;
        }
    }

    static async safeShutdown() {
        await ReviewSequelizer.shutdown();
    }

    static async getActiveDeckOrPrompt(interaction) {
        if(!(interaction.user.id in this.userActiveDecks)) {
            interaction.reply("No active deck set, do /setdeck to choose a deck to study \n (you only have to do this once unless you want to change decks later!)");
            return null;
        }
        return this.userActiveDecks[interaction.user.id];
    }

    static async setDeckMenu(interaction) {
        if(interaction.user.id in this.reviewContexts) {
            await interaction.reply("You've already got a lesson or review in progress! Finish that first or do /finishreviews !");
            return;
        }

        const deckOptions = [];

        for(const deck of Object.keys(reviewDecks)) {
            deckOptions.push({
                label: deck,
                description: deck,
                value: deck
            })
        }

        const deckSelector = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                .setCustomId("setdeck")
                .setPlaceholder("choose deck")
                .addOptions(deckOptions)
            );
        
        await interaction.reply({content: "Choose your deck:", components: [deckSelector]});
    }

    static addLessonIfAvailable(context, record) {
        console.log(`${record.lessonLevel}`);
        if(context.lessonsRemaining > 0 && "next_prompt" in reviewDecks[context.deck][record.lessonLevel]) {
            context.addStaticReview(reviewDecks[context.deck][record.lessonLevel].next_prompt);
            const index = context.reviewQueue.length - 1;
            context.reviewQueue[index].timesWrong = 2; // Force level 0 on first use
            context.reviewQueue[index].nextReviewTime = dayjs().unix(); // Fallback review time if no first review time is ever set
            record.reviews.push(context.reviewQueue[index]);    
            context.lessonsRemaining--;
            context.complete = false;
            return true;
        }
        return false;
    }

    static async startLesson(interaction) {
        if((interaction.user.id in this.reviewContexts)) {
            await interaction.reply("You've already got a lesson or review in progress! Finish that first or do /finishreviews !");
            return;
        }

        var userDeck = await this.getActiveDeckOrPrompt(interaction);
        if(userDeck == null) {
            return;
        }

        var userRecord = await ReviewSequelizer.getReviewStatus(interaction.user.id, userDeck);
        if(userRecord == null) {
            userRecord = await ReviewSequelizer.createNewReviewStatus(interaction.user.id, userDeck);
        }

        console.log(`${userRecord.lessonLevel} ${reviewDecks[userDeck]} ${reviewDecks[userDeck][userRecord.lessonLevel]}`);
        if(userDeck in reviewDecks && "next_prompt" in reviewDecks[userDeck][userRecord.lessonLevel]) {
            var newReviewContext = new ReviewContext(interaction.user.id, userDeck, reviewsRightTillSync);
            this.reviewContexts[interaction.user.id] = newReviewContext;
            newReviewContext.isLesson = true;
            const reviewsToAdd = interaction.options.getInteger('number') != null ? interaction.options.getInteger('number') : 1;
            newReviewContext.lessonsRemaining = reviewsToAdd;
            this.addLessonIfAvailable(newReviewContext, userRecord);
            this.userRecords[interaction.user.id] = userRecord;
            const reply = newReviewContext.getCurrentReviewMessage({currReview: newReviewContext.reviewQueue[0]});
            console.log(reply);
            await interaction.reply(reply);
        }else if(userDeck in reviewDecks && !("next_prompt" in reviewDecks[userDeck][userRecord.lessonLevel])) {
            await interaction.reply("No more lessons available!");
        }else {
            await interaction.reply("It looks like that deck doesn't exist!");
        }
    }

    static async startReviews(interaction) {
        var userDeck = await this.getActiveDeckOrPrompt(interaction);
        if(userDeck == null) {
            return;
        }

        var userRecord = await ReviewSequelizer.getReviewStatus(interaction.user.id, userDeck);

        if(userRecord == null) {
            await interaction.reply("It looks like you haven't done any lessons yet! Do /lesson to get started!");
        } else if(interaction.user.id in this.reviewContexts) {
            await interaction.reply(this.reviewContexts[interaction.user.id].currentReviewPrompt);
            return;
        }
        else {
            this.userRecords[interaction.user.id] = userRecord;
            var newReviewContext = new ReviewContext(interaction.user.id, userDeck, reviewsRightTillSync);
            this.reviewContexts[interaction.user.id] = newReviewContext;
            const currTime = dayjs().unix();

            for(const review of userRecord.reviews) {
                if(review.nextReviewTime == null || review.nextReviewTime <= currTime) {
                    newReviewContext.reviewQueue.push(review);
                }
            }

            if(newReviewContext.reviewQueue.length == 0) {
                await interaction.reply("Looks like you're all caught up!");
                delete this.userRecords[interaction.user.id];
                delete this.reviewContexts[interaction.user.id];
                return;
            }

            newReviewContext.shuffleReviewQueue();
            await interaction.reply(newReviewContext.getCurrentReviewMessage({currReview: newReviewContext.reviewQueue[newReviewContext.reviewIndex]}));
        }
    }

    static async correctLastReview(interaction) {
        if(!(interaction.user.id in this.reviewContexts)) {
            await interaction.reply("It looks like you don't have a review session active!");
            return;
        }

        var currContext = this.reviewContexts[interaction.user.id];
        var userRecord = this.userRecords[interaction.user.id];
        if(typeof(currContext.lastReview) != "undefined" && !currContext.lastReview.wasCorrect && currContext.isLesson) {
            userRecord.lessonLevel = reviewDecks[currContext.deck][userRecord.lessonLevel].next_prompt;
            this.addLessonIfAvailable(currContext, userRecord);
        }
        const correctedText = currContext.correctLastReview();

        if(currContext.syncWhenPossible) {
            console.log("sync in progress");
            await ReviewSequelizer.updateReviewStatus(interaction.user.id, currContext.deck, this.userRecords[interaction.user.id]);
        }

        if(currContext.complete) {
            delete this.reviewContexts[interaction.user.id];
            delete this.userRecords[interaction.user.id];
        }
        await interaction.reply(correctedText);
    }

    static async guessCurrentReview(interaction) {
        if(!(interaction.user.id in this.reviewContexts)) {
            await interaction.reply("It looks like you haven't started your reviews! Do /review to get started!");
            return;
        }

        var userDeck = await this.getActiveDeckOrPrompt(interaction);
        if(userDeck == null) {
            return;
        }
        
        var currContext = this.reviewContexts[interaction.user.id];
        var userRecord = this.userRecords[interaction.user.id];
        var reply = currContext.guessReview(interaction.options.getString('guess')) ?? " ";

        if(typeof(currContext.lastReview) != "undefined" && currContext.lastReview.wasCorrect && currContext.isLesson) {
            userRecord.lessonLevel = reviewDecks[userDeck][userRecord.lessonLevel].next_prompt;
        }
        if(currContext.syncWhenPossible) {
            console.log("sync in progress");
            await ReviewSequelizer.updateReviewStatus(interaction.user.id, userDeck, userRecord);
        }

        if(currContext.complete) {
            if(currContext.isLesson && this.addLessonIfAvailable(currContext, userRecord)) {
                reply = currContext.getCurrentReviewMessage({currReview: currContext.lastReview.review});
            } else {
                delete this.reviewContexts[interaction.user.id];
                delete this.userRecords[interaction.user.id];
            }
        }

        await interaction.reply(reply);
    }

    static async finishReviews(interaction) {
        if(!(interaction.user.id in this.reviewContexts)) {
            await interaction.reply("No reviews active to finish!");
            return;
        }

        var userDeck = await this.getActiveDeckOrPrompt(interaction);
        if(userDeck == null) {
            return;
        }

        console.log("sync in progress");
        await ReviewSequelizer.updateReviewStatus(interaction.user.id, userDeck, this.userRecords[interaction.user.id]);
        delete this.reviewContexts[interaction.user.id];
        delete this.userRecords[interaction.user.id];
        await interaction.reply("All done!");
    }

    static async checkAllReminders(client) {
        const allReviews = await ReviewSequelizer.Reviews.findAll();
        for(const reviewRecord of allReviews) {
            const currTime = dayjs().unix();

            if(reviewRecord.reminderInterval > 0 && reviewRecord.nextReminderTime <= currTime) {
                var reviewsAvailable = 0;

                if(reviewRecord.reviewStatus == null) {
                    continue;
                }
                
                var reviewStatus = JSON.parse(reviewRecord.reviewStatus);
                for(const review of reviewStatus.reviews) {
                    if(review.nextReviewTime == null || review.nextReviewTime <= currTime) {
                        reviewsAvailable++;
                    }
                }

                if(reviewsAvailable != 0 && reviewsAvailable >= reviewRecord.reminderThreshold) {
                    await client.users.send(reviewRecord.user, `Time for your ${reviewRecord.deck} reviews! You have ${reviewsAvailable} items waiting for you!`);

                    reviewRecord.nextReminderTime = currTime + reviewRecord.reminderInterval;
                    console.log(`next reminder time for ${reviewRecord.user} now ${reviewRecord.nextReminderTime}`);
                    await ReviewSequelizer.Reviews.update({nextReminderTime: reviewRecord.nextReminderTime}, {where: {
                        user: reviewRecord.user, deck: reviewRecord.deck}});
                }
            }
        }
    }

    static async setReminder(interaction) {
        var userDeck = await this.getActiveDeckOrPrompt(interaction);
        if(userDeck == null) {
            return;
        }

        var reminderHourInterval = interaction.options.getInteger('interval');
        var reminderSecondsInterval = reminderHourInterval * 60 * 60;
        const currTime = dayjs().unix();

        const rows = await ReviewSequelizer.Reviews.update({
            reminderInterval: reminderSecondsInterval, nextReminderTime: currTime + reminderSecondsInterval, reminderThreshold: 
            (interaction.options.getInteger('threshold') != null ? interaction.options.getInteger('threshold') : 0)}, 
            {where: { user: interaction.user.id, deck: userDeck }});

        if(rows <= 0) {
            await interaction.reply(`You don't have any reviews to set a reminder for! Do /lesson to get started!`);
            return;
        }

        console.log(`setting a reminder with interval ${reminderSecondsInterval} for ${interaction.user.id},${userDeck}`);
        console.log(`at reminder set currtime is ${currTime} and next reminder is ${reminderSecondsInterval + currTime}`);
        var responseString = ``;
        if(reminderSecondsInterval > 0) {
            responseString += `Okay, I'll try to remind you to do your ${userDeck} reviews when they're available every ${reminderHourInterval} hours`;

            if(interaction.options.getInteger('threshold') != null) {
                responseString += `, and only if you have at least ${interaction.options.getInteger('threshold')} reviews available`
            }
        } else {
            responseString += `Okay, I won't send you reminders`
        }

        responseString += `.`;
        await interaction.reply(responseString);
    }
}

module.exports = ReviewContextManager;