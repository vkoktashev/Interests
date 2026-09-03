export default function formatDuration(minutes: number): string {
	const roundedMinutes = Math.max(Math.round(minutes), 0);
	const hours = Math.floor(roundedMinutes / 60);
	const minutesRemainder = roundedMinutes % 60;

	if (hours === 0) {
		return `${minutesRemainder} мин`;
	}
	if (minutesRemainder === 0) {
		return `${hours} ч`;
	}
	return `${hours} ч ${minutesRemainder} мин`;
}
