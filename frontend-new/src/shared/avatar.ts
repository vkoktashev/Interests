export function getDefaultAvatarUrl(seedValue: string | number) {
	const seed = encodeURIComponent(String(seedValue || 'user'));

	return `https://api.dicebear.com/9.x/thumbs/svg?backgroundColor=ffdfbf,ffd5dc,f88c49,f1f4dc,d1d4f9,c0aede,b6e3f4,69d2e7&backgroundType[]&shapeColor=1c799f,f88c49,0a5b83&seed=${seed}`;
}
