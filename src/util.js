import fetch from 'node-fetch'

export const transcript = async (text) => {
	const res = await fetch('https://paste.blazemc.one/documents', {
		headers: {
			accept: 'application/json, text/javascript, */*; q=0.01',
			'content-type': 'text/plain; charset=UTF-8'
		},
		body: text,
		method: 'POST'
	})

	if (!res.ok) return null

	const data = await res.json()

	if (!data.key) return null

	return `https://paste.blazemc.one/${data.key}`
}
