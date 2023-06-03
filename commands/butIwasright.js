const { SlashCommandBuilder } = require('discord.js');
var ReviewContextManager = require('../ReviewContextManager.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('butiwasright')
		.setDescription('Corrects your last review in case of typos or bugs.'),
	async execute(interaction) {
		await ReviewContextManager.correctLastReview(interaction);
	},
};
