import {
	SlashCommandBuilder,
	EmbedBuilder,
	ModalBuilder,
	ActionRowBuilder,
	BaseGuildTextChannel,
	TextInputBuilder,
	TextInputStyle,
	ButtonBuilder,
	ButtonStyle,
	ChannelType
} from 'discord.js'
import { nanoid } from 'nanoid'
import ms from 'ms'
import config from '../config.js'

export const suggestCmd = {
	data: new SlashCommandBuilder().setName('suggest').setDescription('No description'),
	/**
	 *
	 * @param {import('discord.js').ChatInputCommandInteraction} ctx
	 */
	async run(ctx) {
		const channel = ctx.client.channels.cache.get(config.suggest.default)

		if (!channel || !(channel instanceof BaseGuildTextChannel))
			return ctx.reply({
				content: 'No suggestion channel found, contact stuff to fix this issue.',
				ephemeral: true
			})

		const modalId = nanoid(12)

		const modal = new ModalBuilder()
			.setTitle('Suggest')
			.setCustomId(modalId)
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setLabel('Suggestion')
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
			new ButtonBuilder().setStyle(ButtonStyle.Success).setCustomId('approve').setLabel('Approve'),
			new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('Deny').setCustomId('deny')
		)

		const msg = await channel.send({
			embeds: [embed],
			components: [row, staffRow]
		})

		await channel.threads.create({ name: 'Discussion', startMessage: msg, type: ChannelType.PublicThread })
		await ctx.followUp('Suggestion submitted')
	}
}
