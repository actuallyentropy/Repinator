const { SlashCommandBuilder } = require('discord.js');
var ReviewContextManager = require('../ReviewContextManager.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('review')
		.setDescription('Initiates reviews!'),
	async execute(interaction) {
		await ReviewContextManager.startReviews(interaction);
	},
};
