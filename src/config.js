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

	database: { // Redis database credentials
		host: 'Redis_IP',
		port: Redis_Port,
		password: 'Redis_Password'
	},

	suggest: { // Suggest Channel ID
		default: '971257332476543067',
		approved: '971257332476543067',
		denied: '971257332476543067'
	},

	bugReport: { // Bug report Channel ID
		default: '1153563334700957738',
		rejected: '1153563334700957738',
		fixed: '971252181061763132'
	}
}
