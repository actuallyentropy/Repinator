const { ThreadMemberFlags } = require('discord.js');
const Sequelize = require('sequelize');
const { reviewDbName, reviewDbUser, reviewDbPass } = require('./config.json');

class ReviewSequelizer {
    static sequelize = new Sequelize(reviewDbName, reviewDbUser, reviewDbPass, {
        host: 'localhost',
        dialect: 'sqlite',
        logging: false,
        storage: 'database.sqlite',
    });
    static Reviews;

    static {
        this.Reviews = this.sequelize.define('reviews', {
            user: Sequelize.STRING,
            deck: Sequelize.STRING,
            reviewStatus: Sequelize.JSON,
            reminderInterval: {
                type: Sequelize.BIGINT,
                defaultValue: 0,
                allowNull: false
            },
            nextReminderTime: {
                type: Sequelize.BIGINT,
                defaultValue: 0,
                allowNull: false
            },
            reminderThreshold: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false
            }
        });

        this.DeckSettings = this.sequelize.define('decksettings', {
            user: {
                type: Sequelize.STRING,
                primaryKey: true
            },
            activeDeck: Sequelize.STRING
        });

        this.Reviews.sync({force: false, alter: true});
        this.DeckSettings.sync({force: false, alter: true});
    }

    static async createNewReviewStatus(user, deck) {
        var newReviewStatus = {lessonLevel: "_meta_", reviews: []};
        try {
            const newReview = this.Reviews.create({
                user: user,
                deck: deck,
                reviewStatus: JSON.stringify(newReviewStatus)
            });
            console.log(newReview);
        } catch(error) {
            console.log(error);
        }

        return newReviewStatus;
    }

    static async getReviewStatus(user, deck) {
        const reviewRecord = await this.Reviews.findOne({where: {user: user, deck: deck}});

        if (reviewRecord) {
            console.log(reviewRecord);
            return (JSON.parse(reviewRecord.get('reviewStatus')));
        }

        return null;
    }

    static async updateReviewStatus(user, deck, reviewStatus) {
        const affectedRows = await this.Reviews.update({reviewStatus: JSON.stringify(reviewStatus)}, {where: {user: user, deck: deck}});

        if(affectedRows <= 0) {
            try {
                await this.Reviews.create({user: user, deck: deck, reviewStatus: JSON.stringify(reviewStatus)});
            }catch(error) {
                console.log(error);
            }
        }
    }

    static async getActiveDeck(user) {
        const decksettingRecord = await this.DeckSettings.findOne({where: {user: user}});

        if(decksettingRecord) {
            return decksettingRecord.activeDeck;
        }

        return null;
    }

    static async setActiveDeck(user, deck) {
        const affectedRows = await this.DeckSettings.update({activeDeck: deck}, {where: {user: user}});

        if(affectedRows <= 0) {
            try {
                await this.DeckSettings.create({user: user, activeDeck: deck});
            } catch(error) {
                console.log(error);
            }
        }
    }

    static async shutdown() {
        this.sequelize.close();
    }
}

module.exports = ReviewSequelizer;