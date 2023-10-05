import {
	SlashCommandBuilder,
	EmbedBuilder,
	ModalBuilder,
	ActionRowBuilder,
	BaseGuildTextChannel,
	TextInputBuilder,
	TextInputStyle,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js'
import { nanoid } from 'nanoid'
import ms from 'ms'
import config from '../config.js'

export const bugReportCmd = {
	data: new SlashCommandBuilder().setName('bug_report').setDescription('No description'),
	/**
	 *
	 * @param {import('discord.js').ChatInputCommandInteraction} ctx
	 */
	async run(ctx) {
		const channel = ctx.client.channels.cache.get(config.bugReport.default)

		if (!channel || !(channel instanceof BaseGuildTextChannel))
			return ctx.reply({
				content: 'No bug report channel found, contact stuff to fix this issue.',
				ephemeral: true
			})

		const modalId = nanoid(12)

		const modal = new ModalBuilder()
			.setTitle('Bug report')
			.setCustomId(modalId)
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setLabel('Bug description')
						.setRequired(true)
						.setStyle(TextInputStyle.Paragraph)
						.setCustomId('content')
				)
			)

		await ctx.showModal(modal)

		const res = await ctx.awaitModalSubmit({
			filter: (i) => i.customId === modalId,
			time: ms('30 minutes')
		})

		await res.deferUpdate()

		const embed = new EmbedBuilder()
			.setAuthor({
				name: ctx.user.username,
				iconURL: ctx.user.displayAvatarURL(),
				url: `https://discord.com/users/${ctx.user.id}`
			})
			.setDescription(res.fields.getTextInputValue('content'))
			.setColor('#303434')
			.setTimestamp()

		const row = new ActionRowBuilder()

		row.addComponents(
			new ButtonBuilder().setLabel('0').setEmoji('⬆').setStyle(ButtonStyle.Secondary).setCustomId('upvote'),
			new ButtonBuilder().setLabel('0').setEmoji('⬇').setStyle(ButtonStyle.Secondary).setCustomId('downvote')
		)

		const staffRow = new ActionRowBuilder()

		staffRow.addComponents(
			new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel('Fixed').setCustomId('fixed'),
			new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel('Working on').setCustomId('working_on'),
			new ButtonBuilder().setStyle(ButtonStyle.Danger).setCustomId('reject').setLabel('Reject')
		)

		await channel.send({
			embeds: [embed],
			components: [row, staffRow]
		})

		await ctx.followUp({
			content: 'Bug reported',
			ephemeral: true
		})
	}
}
