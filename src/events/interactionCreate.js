import {
	ActionRowBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	OverwriteType,
	PermissionFlagsBits,
	StringSelectMenuBuilder
} from 'discord.js'
import db from '../database.js'
import config from '../config.js'
import ms from 'ms'
import { transcript } from '../util.js'

const cooldown = new Set()

const VoteType = Object.freeze({
	upvote: 0,
	downvote: 1
})

/**
 *
 * @param {import('discord.js').Interaction} ctx
 */
export const interactionCreate = async (ctx) => {
	if (!ctx.inGuild()) return

	if (ctx.isButton() && (ctx.customId === 'accept_application' || ctx.customId === 'reject_application')) {
		const member = await ctx.guild.members.fetch({ user: ctx.user, force: false })

		if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
			return ctx.reply({
				ephemeral: true,
				content: "You don't have permissions to perform this action."
			})
		}

		await ctx.deferUpdate()

		if (ctx.channel instanceof BaseGuildTextChannel) {
			await ctx.channel.permissionOverwrites.edit(
				ctx.channel.name,
				{ SendMessages: false },
				{ type: OverwriteType.Member }
			)
		}

		await ctx.channel.permissionOverwrites

		const messages = await ctx.channel.messages.fetch({ limit: 100 })

		const transcriptUrl = await transcript(
			messages
				.reverse()
				.filter((m) => !m.author.bot && m.content)
				.map((m) => `${m.author.username}: ${m.cleanContent}`)
				.join('\n\n')
		)

		const row = new ActionRowBuilder()

		row.addComponents(new ButtonBuilder().setURL(transcriptUrl).setStyle(ButtonStyle.Link).setLabel('Transcript'))

		await ctx.message.edit({
			components: [row],
			embeds: [
				new EmbedBuilder(ctx.message.embeds[0].toJSON()).setColor(ctx.customId.startsWith('accept') ? 'Green' : 'Red')
			]
		})

		await ctx.channel.send(`<@${ctx.channel.name}>`).then((it) => it.delete().catch(() => null))

		return
	}

	if (ctx.isStringSelectMenu() && ctx.customId === 'position') {
		if (ctx.user.id !== ctx.channel.name)
			return ctx.reply({
				ephemeral: true,
				content: 'Only who opened the application can select.'
			})

		const position = ctx.values[0]
		const questions = config.positions[position]

		await ctx.update({ components: [] })

		const answers = new Map()

		for (const question of questions) {
			await ctx.channel.send(`${ctx.user}, ` + question)

			let msg

			while (!msg)
				msg = await ctx.channel
					.awaitMessages({
						time: ms('30 minutes'),
						filter: (m) => m.channelId === ctx.channelId && m.author.id === ctx.user.id,
						max: 1
					})
					.then((it) => it.first())

			answers.set(question, msg.content.slice(0, 1024) + (msg.content.length > 1024 ? '...' : ''))
		}

		const botMessages = ctx.channel.messages.cache.filter((it) => it.author.bot)

		await ctx.channel.bulkDelete(botMessages)

		const embed = new EmbedBuilder().setColor('#303434').setTimestamp()

		embed.addFields({
			name: 'Position',
			value: position
		})

		for (const [name, value] of answers.entries()) {
			embed.addFields({ name, value })
		}

		const row = new ActionRowBuilder()

		row.addComponents(
			new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel('Accept').setCustomId('accept_application'),
			new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('Reject').setCustomId('reject_application')
		)

		await ctx.channel.send({
			embeds: [embed],
			components: [row]
		})

		return
	}

	if (ctx.isButton() && ctx.customId === 'application_open') {
		await ctx.deferReply({ ephemeral: true })

		let cat = ctx.guild.channels.cache.find(
			(it) =>
				it.type === ChannelType.GuildCategory && it.name.toLowerCase() === config.applicationCategoryName.toLowerCase()
		)

		if (!cat)
			cat = await ctx.guild.channels.create({
				type: ChannelType.GuildCategory,
				name: config.applicationCategoryName,
				permissionOverwrites: [
					{
						id: ctx.guildId,
						type: OverwriteType.Role,
						deny: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory
					}
				]
			})

		let channel = ctx.guild.channels.cache.find((it) => it.parentId === cat.id && it.name === ctx.user.id)

		if (channel) return ctx.editReply('You have an opened application.')

		channel = await ctx.guild.channels.create({
			parent: cat,
			type: ChannelType.GuildText,
			name: ctx.user.id,
			permissionOverwrites: [
				{
					id: ctx.guildId,
					type: OverwriteType.Role,
					deny: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory
				},
				{
					id: ctx.user.id,
					type: OverwriteType.Member,
					allow:
						PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory | PermissionFlagsBits.SendMessages
				}
			]
		})

		await ctx.editReply(`An application has been opened: ${channel}`)

		const row = new ActionRowBuilder()

		row.addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('position')
				.setPlaceholder('Select position')
				.addOptions(Object.keys(config.positions).map((it) => ({ label: it, value: it })))
		)

		await channel.send({
			content: `${ctx.user}, What the position you're applying for?`,
			components: [row]
		})

		return
	}

	if (ctx.isButton() && typeof VoteType[ctx.customId] !== 'undefined') {
		await ctx.deferUpdate()

		const identifier = ctx.message.id + ctx.user.id

		if (cooldown.has(identifier)) return

		cooldown.add(identifier)

		setTimeout(() => cooldown.delete(identifier), 1_000)

		const components = ctx.message.components.map((it) => it.components).flat()

		let upvote = Number(components.find((it) => it.customId === 'upvote').label),
			downvote = Number(components.find((it) => it.customId === 'downvote').label)
		let removed = false

		const votedBefore = await db.get(identifier)

		if (votedBefore === VoteType[ctx.customId]) {
			votedBefore === VoteType.upvote ? upvote-- : downvote--
			await db.delete(identifier)
			removed = true
		} else if (typeof votedBefore === 'number') {
			votedBefore === VoteType.upvote ? (upvote--, downvote++) : (downvote--, upvote++)
		} else {
			VoteType[ctx.customId] === VoteType.upvote ? upvote++ : downvote++
		}

		if (!removed) {
			await db.set(identifier, VoteType[ctx.customId])
		}

		await ctx.message.edit({
			components: ctx.message.components.reduce((acc, cur) => {
				const row = new ActionRowBuilder()

				for (const comp of cur.components) {
					if (comp.customId === 'upvote' || comp.customId === 'downvote') {
						const btn = new ButtonBuilder(comp.toJSON()).setLabel(
							(comp.customId === 'upvote' ? upvote : downvote).toString()
						)
						row.addComponents(btn)
					} else {
						row.addComponents(comp)
					}
				}

				acc.push(row)

				return acc
			}, [])
		})
	}

	if (ctx.isButton() && ['approve', 'deny', 'reject', 'fixed', 'working_on'].includes(ctx.customId)) {
		const member = await ctx.guild.members.fetch({ user: ctx.user, force: false })

		if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
			return ctx.reply({ ephemeral: true, content: 'Only staff can use this button.' })
		}

		await ctx.deferUpdate()

		const embed = new EmbedBuilder(ctx.message.embeds[0].toJSON())

		let status = null,
			color = null,
			channelId = null

		switch (ctx.customId) {
			case 'reject': {
				status = 'Rejected'
				color = 'Red'
				channelId = config.bugReport.rejected
				break
			}

			case 'fixed': {
				status = 'Fixed'
				color = 'Green'
				channelId = config.bugReport.fixed
				break
			}

			case 'working_on': {
				status = 'Working on'
				color = 'Orange'
				break
			}

			case 'approve': {
				status = 'Approved'
				color = 'Green'
				channelId = config.suggest.approved
				break
			}

			case 'deny': {
				status = 'Denied'
				color = 'Red'
				channelId = config.suggest.denied
				break
			}

			default:
				break
		}

		embed.setColor(color).setFooter({ text: `Status: ${status}` })

		await ctx.message.edit({
			embeds: [embed]
		})

		const channel = channelId ? ctx.client.channels.cache.get(channelId) : null

		if (channel?.isTextBased()) {
			await channel.send({ embeds: [embed] })
		}
	}

	if (!ctx.isChatInputCommand()) return

	const command = ctx.client.commands.get(ctx.commandName)

	if (!command) return

	try {
		await command.run(ctx)
	} catch (err) {
		console.error(err)
		const say = (content) =>
			ctx.replied || ctx.deferred ? ctx.editReply(content) : ctx.reply({ content, ephemeral: true })
		await say('An error has occurred').catch(() => null)
	}
}
