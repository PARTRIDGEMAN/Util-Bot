import {
	SlashCommandBuilder,
	EmbedBuilder,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
	ButtonBuilder,
	ButtonStyle,
	PermissionFlagsBits
} from 'discord.js'
import ms from 'ms'

export const applicationCmd = {
	data: new SlashCommandBuilder()
		.setName('application')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDescription('No description'),
	/**
	 *
	 * @param {import('discord.js').ChatInputCommandInteraction} ctx
	 */
	async run(ctx) {
		const modal = new ModalBuilder().setCustomId('application_embed').setTitle('Application Embed')

		modal.addComponents(
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setMaxLength(256)
					.setMinLength(1)
					.setLabel('Title')
					.setCustomId('title')
					.setRequired(true)
					.setStyle(TextInputStyle.Short)
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setMinLength(1)
					.setMaxLength(4000)
					.setLabel('Description')
					.setCustomId('description')
					.setRequired(true)
					.setStyle(TextInputStyle.Paragraph)
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setMinLength(1)
					.setMaxLength(100)
					.setLabel('Button Text')
					.setCustomId('button_text')
					.setRequired(true)
					.setValue('Open')
					.setStyle(TextInputStyle.Short)
			)
		)

		await ctx.showModal(modal)

		const submit = await ctx.awaitModalSubmit({
			time: ms('30 minutes'),
			filter: (i) => i.customId === 'application_embed' && i.channelId === ctx.channelId && i.user.id === ctx.user.id
		})

		await submit.deferUpdate()

		const embed = new EmbedBuilder()
			.setColor('#303434')
			.setTitle(submit.fields.getTextInputValue('title'))
			.setDescription(submit.fields.getTextInputValue('description'))

		const row = new ActionRowBuilder()

		row.addComponents(
			new ButtonBuilder()
				.setLabel(submit.fields.getTextInputValue('button_text'))
				.setStyle(ButtonStyle.Primary)
				.setCustomId('application_open')
		)

		await ctx.channel.send({
			embeds: [embed],
			components: [row]
		})
	}
}
