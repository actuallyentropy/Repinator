const { SlashCommandBuilder } = require('discord.js');
var ReviewContextManager = require('../ReviewContextManager.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('finishreviews')
		.setDescription('Finishes your current review session to allow you to start a new one or change your deck.'),
	async execute(interaction) {
		await ReviewContextManager.finishReviews(interaction);
	},
};
