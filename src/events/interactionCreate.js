import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } from 'discord.js'
import db from '../database.js'
import config from '../config.js'

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
