const { SlashCommandBuilder } = require('discord.js');
var ReviewContextManager = require('../ReviewContextManager.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remindme')
		.setDescription('Set a reminder to do your reviews!')
        .addIntegerOption(option =>
            option.setName('interval')
            .setDescription('The frequency in hours to send reminders if you have reviews available (or 0 to disable reminders)')
			.setMinValue(0)
			.setMaxValue(8760)
            .setRequired(true))
		.addIntegerOption(option =>
			option.setName('threshold')
			.setDescription('The minimum amount of reviews that need to be available to get a reminder (optional)')
			.setMinValue(0)
			.setMaxValue(1000)
			.setRequired(false)),
	async execute(interaction) {
		await ReviewContextManager.setReminder(interaction);
	},
};
