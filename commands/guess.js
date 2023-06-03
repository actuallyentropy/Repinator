const { SlashCommandBuilder } = require('discord.js');
var ReviewContextManager = require('../ReviewContextManager.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('guess')
		.setDescription('Guess your review!')
        .addStringOption(option =>
            option.setName('guess')
            .setDescription('Guess your current prompt!')
            .setRequired(true)),
	async execute(interaction) {
		await ReviewContextManager.guessCurrentReview(interaction);
	},
};
