interface IFormatHoursOptions {
	fractionDigits?: number;
}

function parseHours(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isNaN(value) ? null : value;
	}

	const parsed = parseFloat(String(value ?? ''));
	return Number.isNaN(parsed) ? null : parsed;
}

function roundToTenth(value: number): number {
	return Math.round(value * 10) / 10;
}

export function getHoursUnit(value: unknown): string {
	const parsed = parseHours(value);
	if (parsed === null) {
		return 'часов';
	}

	const rounded = roundToTenth(parsed);
	if (!Number.isInteger(rounded)) {
		return 'часов';
	}

	const abs = Math.abs(rounded);
	const mod100 = abs % 100;
	const mod10 = abs % 10;

	if (mod100 >= 11 && mod100 <= 14) {
		return 'часов';
	}
	if (mod10 === 1) {
		return 'час';
	}
	if (mod10 >= 2 && mod10 <= 4) {
		return 'часа';
	}
	return 'часов';
}

export default function formatHours(value: unknown, options: IFormatHoursOptions = {}): string {
	const parsed = parseHours(value);
	if (parsed === null) {
		return '-';
	}

	const rounded = roundToTenth(parsed);
	const valueText = typeof options.fractionDigits === 'number'
		? rounded.toFixed(options.fractionDigits)
		: Number.isInteger(rounded)
			? String(rounded)
			: rounded.toFixed(1);

	return `${valueText} ${getHoursUnit(rounded)}`;
}
