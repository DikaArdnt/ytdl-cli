import chalk from "chalk";

export const playlistURLPattern = /list=([^#&?]*).*/;

export const getPlaylistId = url => {
	const match = url.match(playlistURLPattern);
	if (match && match[1]) {
		return match[1];
	}
	return null;
};

export const getVideoId = link => {
	const validQueryDomains = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'gaming.youtube.com']);
	const validPathDomains = /^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/(embed|v|shorts|live)\/)/;
	const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;

	if (videoIdPattern.test(link.trim())) {
		return link.trim();
	}

	const parsed = new URL(link.trim());

	let id = parsed.searchParams.get('v');
	if (validPathDomains.test(link.trim()) && !id) {
		const paths = parsed.pathname.split('/');
		id = parsed.host === 'youtu.be' ? paths[1] : paths[2];
	} else if (parsed.hostname && !validQueryDomains.has(parsed.hostname)) {
		return null;
	}
	if (!id) {
		return null;
	}
	id = id.substring(0, 11);

	if (!videoIdPattern.test(id)) {
		return null;
	}

	return id;
};

// Maksimal panjang nama file untuk berbagai OS
export const MAX_FILENAME_LENGTH = {
	win32: 255,
	linux: 255,
	darwin: 255,
	other: 255,
};

export const parseFileName = (name, os = process.platform) => {
	const invalidChars = /[<>:"/\\|?*]/g;
	const cleaned = name.replace(invalidChars, '').trim();
	const maxLen = MAX_FILENAME_LENGTH[os] || MAX_FILENAME_LENGTH.other;
	return cleaned.substring(0, maxLen);
};

/**
 * Format text with ANSI escape codes for CLI display
 *
 * @param {string} text
 * @returns {string}
 */
export function prettyText(text) {
	// Bold: **text** -> bold text
	text = text.replace(/\*\*([^*]+)\*\*/g, (_, match) => chalk.bold(chalk.underline(match)));

	// Italic: *text* or _text_ -> italic text
	text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, match) => chalk.italic(match));
	text = text.replace(/_(?!_)([^_]+)_(?!_)/g, (_, match) => chalk.italic(match));

	// Underline: __text__ -> underlined text
	text = text.replace(/__([^_]+)__/g, (_, match) => chalk.underline(match));

	// Strikethrough: ~~text~~ -> strikethrough text (if supported)
	text = text.replace(/~~([^~]+)~~/g, (_, match) => chalk.strikethrough(match));

	// Links: [text](url) -> text (url in cyan)
	text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => `${label} (${chalk.cyan(chalk.underline(url))})`);

	// Lists: - item -> • item
	text = text.replace(/^\s*-\s+(.+)/gm, (_, match) => `• ${match}`);

	// Headers: #, ##, ### -> formatted headers
	text = text.replace(/^### (.+)/gm, (_, match) => chalk.blue(chalk.bold(match))); // H3 in blue
	text = text.replace(/^## (.+)/gm, (_, match) => chalk.green(chalk.bold(match))); // H2 in green
	text = text.replace(/^# (.+)/gm, (_, match) => chalk.underline(chalk.bold(match))); // H1 bold + underline

	return text.trim();
}