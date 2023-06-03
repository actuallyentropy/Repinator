const { SlashCommandBuilder } = require('discord.js');
var ReviewContextManager = require('../ReviewContextManager.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('lesson')
		.setDescription('Learn a new prompt for your reviews!')
		.addIntegerOption(option =>
			option.setName('number')
			.setDescription('the number of lessons to go through (optional)')
			.setMinValue(1)
			.setMaxValue(1000)
			.setRequired(false)),
	async execute(interaction) {
		await ReviewContextManager.startLesson(interaction);
	},
};
