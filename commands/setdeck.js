const { SlashCommandBuilder } = require('discord.js');
var ReviewContextManager = require('../ReviewContextManager.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setdeck')
		.setDescription('Provides a menu to set the deck you want to study.'),
	async execute(interaction) {
		await ReviewContextManager.setDeckMenu(interaction);
	},
};
