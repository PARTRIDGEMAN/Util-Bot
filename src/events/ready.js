/**
 *
 * @param {import('discord.js').Client} client
 */
export const ready = async (client) => {
	console.log('Connected to Discord API')
	console.log(client.user.tag)

	const commands = [...client.commands.values()].map((it) => it.data.setDMPermission(false))

	await client.application.commands.set(commands)
}
