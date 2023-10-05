import 'dotenv/config'
import env from 'env-var'

/* Notice:
To configure the variables for the bot, you will need to create a file named '.env' within the project directory and define the variables within. 
Here is an example of the expected format for the contents of the '.env' file:

DISCORD_TOKEN=your-token-here

Make sure to replace 'your-token-here' with the actual token for your Discord bot.
*/

export default {
	token: env.get('DISCORD_TOKEN').required().asString(),

	database: {
		// Redis database credentials
		host: 'Your Redis Server IP', //redis server IP
		port: 6379, //your redis server port, 6379 is the default 
		password: 'Your Reids Pass' //redis server password
	},

	suggest: {
		// Suggest Channel ID
		default: 'Channel ID', //where suggestions go (make sure users can send msgs in threads)
		approved: 'Channel ID', //where approved suggestions go
		denied: 'Channel ID' //where denied suggestions go
	},

	bugReport: {
		// Bug report Channel ID
		default: 'Channel ID', //where bug reports go (make sure users can send msgs in threads)
		rejected: 'Channel ID', //where rejected bug reports go
		fixed: 'Channel ID' //where fixed bug reports go
	},

	applicationCategoryName: 'Applications',

	// Set of positions with their questions you can add as many as you'd like. All you need to do to get this as a panel with buttons is do /apply
	positions: {
		Admin: ['Whats your name?', 'Whats your age?', 'Why do you want admin'],
		Mod: ['Whats your name?', 'Whats your age?', 'Why do you want Mod'],
		Dev: ['Whats your name?', 'Whats your age?', 'Why do you want dev']
	}
}
