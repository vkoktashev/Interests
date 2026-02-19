export function getDefaultAvatarUrl(seedValue: string | number) {
	const seed = encodeURIComponent(String(seedValue || 'user'));

	return `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`;
}
