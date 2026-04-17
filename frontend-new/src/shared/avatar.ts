type TAvatarGender = 'male' | 'female' | undefined | null;

const AVATAR_PALETTES: Record<'male' | 'female' | 'neutral', {background: string; shape: string}> = {
	male: {
		background: 'd7e8ff,cddafd,c6ecf5,bfd0f5,e1ebff',
		shape: '2563eb,1d4ed8,0f766e,1e3a8a',
	},
	female: {
		background: 'ffd9e6,ffe4ef,f7d7ff,f9e3ec,ffe0f3',
		shape: 'db2777,be185d,a21caf,9d174d',
	},
	neutral: {
		background: 'ffdfbf,f1f4dc,d1d4f9,b6e3f4,e3dcf8',
		shape: '1c799f,f88c49,0a5b83,7c3aed',
	},
};

function normalizeGender(gender?: TAvatarGender): 'male' | 'female' | 'neutral' {
	if (gender === 'male' || gender === 'female') {
		return gender;
	}
	return 'neutral';
}

export function getDefaultAvatarUrl(seedValue: string | number, gender?: TAvatarGender) {
	const seed = encodeURIComponent(String(seedValue || 'user'));
	const palette = AVATAR_PALETTES[normalizeGender(gender)];

	return `https://api.dicebear.com/9.x/thumbs/svg?backgroundColor=${palette.background}&backgroundType[]&shapeColor=${palette.shape}&seed=${seed}`;
}
