export default async (url: string) => {
	const result = await fetch(url, {
		mode: 'cors',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	if (!result.ok) {
		const message = `An error has occured: ${result.status}`;
		throw new Error(message);
	}

	return await result.json();
};
