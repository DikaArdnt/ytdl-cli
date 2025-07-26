#!/usr/bin/env node

process.loadEnvFile('./.env');

import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';

import API from './utils/api.js';
import { getPlaylistId, getVideoId, playlistURLPattern, prettyText } from './utils/parse.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

async function main() {
	const program = new Command('YouTube Audio & Video Downloader');

	program.option('-v, --version', 'Show version', () => {
		const packageJson = JSON.parse(fs.readFileSync(path.join(dirname, '/package.json'), 'utf8'));
		console.log(`YouTube CLI Downloader Version: ${packageJson.version}`);
		process.exit(0);
	});

	const api = new API(process.env.API_KEY);

	if (!process.env.API_KEY) {
		console.error(chalk.red('API key is not set. Please run `ytdl auth set <your_api_key>` to set your API key.'));
		process.exit(1);
	}

	program
		.option('-l, --link <url>', 'Input URL for the YouTube video or music')
		.option('-i, --info', 'Get information about the YouTube video or music')
		.option('-o, --output <path>', 'Output path for the downloaded folder', 'downloads')
		.option('-a, --audio', 'Download audio only', false)
		.option('-q, --quality <quality>', 'Set the quality (e.g., 144, 360, 480, 720, 1080, audio)', '720')
		.option('-p, --playlist <url>', 'Get information about the YouTube playlist')
		.description(
			`> Default download as 720 quality and video if no options are provided.\n> Use link with value.txt file to download multiple videos.\n> If the input URL is a YouTube Music link (contains 'music.youtube.com'), it will be downloaded as MP3 audio.`
		)
		.action(async options => {
			// Get Playlist Information
			if (options.playlist || playlistURLPattern.test(options.link)) {
				if (playlistURLPattern.test(options.link)) {
					console.log(chalk.yellow('You provided a YouTube playlist link, using it to fetch playlist information.'));
					options.playlist = options.link;
				}

				const playlistId = getPlaylistId(options.playlist);
				if (!playlistId) {
					console.error(chalk.red('Could not extract playlist ID from the provided link.'));
					process.exit(1);
				}

				const spinner = ora(' Fetching playlist information...').start();

				try {
					const response = await api.get('/info', { url: 'https://www.youtube.com/playlist?list=' + playlistId });

					spinner.succeed(' Playlist information fetched successfully!');
					console.log(chalk.green.bold('\n=== Playlist Information ==='));
					console.log(`${chalk.cyan('Title        :')} ${chalk.white(prettyText(response.playlist_title))}`);
					console.log(`${chalk.cyan('Author       :')} ${chalk.white(response.uploader)}`);
					console.log(`${chalk.cyan('Author URL   :')} ${chalk.white(response.uploaderurl)}`);
					console.log(`${chalk.cyan('Size         :')} ${chalk.white(response.total_videos || 'Unknown')}`);

					// Write playlist information to a file
					const dataText = `quality=720\n${response.videos.map(video => video.url).join('\n')}`;
					fs.writeFileSync(path.join(process.cwd(), 'playlist.txt'), dataText, 'utf8');

					console.log(chalk.blue.bold('\n=== Playlist Videos ==='));
					response.videos.forEach((video, index) => {
						console.log(
							`${chalk.yellow.bold(index + 1)}. ${chalk.white(prettyText(video.title))} (${chalk.green(video.duration + ' Seconds')})`
						);
						console.log(`   ${chalk.cyan('URL:')} ${chalk.white(video.url)}`);
					});

					console.log(chalk.green.bold('\nPlaylist information saved to playlist.txt'));
					console.log(chalk.green.bold('You can download with command `ytdl -l playlist.txt`.'));

					// Exit after fetching playlist information
					process.exit(0);
				} catch (error) {
					spinner.fail(' Failed to fetch playlist information.');
					console.error(error.message);
					process.exit(1);
				}
			}

			if (!options.link) {
				console.error(chalk.red('You must provide a YouTube link using the -l or --link option.'));
				process.exit(1);
			}

			// Download From File .txt
			if (fs.existsSync(options.link) && fs.lstatSync(options.link).isFile() && path.extname(options.link) === '.txt') {
				const filePath = path.resolve(options.link);
				const fileContent = fs.readFileSync(filePath, 'utf8');
				const links = fileContent.split('\n').filter(link => link.trim() !== '');
				if (links.length === 0) {
					console.error(chalk.red('The provided file is empty or contains no valid links.'));
					process.exit(1);
				}

				options.link = links
					.map((link, index) => {
						link = getVideoId(link);

						// If the link is empty and it's the first link, check for quality parameter
						// This allows for a link like "q=720p" to set the quality without a valid URL
						// This will set the default quality for all links that are not set to persistent quality
						if (!link && index === 0 && /^q(uality)?=(.*)/.test(options.link) && !options.quality) {
							const match = options.link.match(/^q(uality)?=(.*)/);
							options.quality = match[2].trim();
						}

						return link;
					})
					.filter(link => link);
			}

			// Get Video Information
			if (options.info && typeof options.link === 'string') {
				const spinner = ora(' Fetching video information...').start();

				try {
					const videoInfo = await api.get('/info', { url: decodeURIComponent(options.link) });
					spinner.succeed(' Video information fetched successfully!');

					console.log(chalk.green.bold('\n=== Video Information ==='));
					console.log(`${chalk.cyan('Title       :')} ${chalk.white(prettyText(videoInfo.title))}`);
					console.log(`${chalk.cyan('Author      :')} ${chalk.white(videoInfo.channel)}`);
					console.log(`${chalk.cyan('Author URL  :')} ${chalk.white(videoInfo.channelurl)}`);
					console.log(`${chalk.cyan('Duration    :')} ${chalk.white(videoInfo.duration)}`);

					console.log(chalk.blue.bold('\n=== Available Formats ==='));
					const choices = videoInfo.resolutions
						.map(format => ({
							name: `${chalk.yellow(format.ext)} - ${chalk.magenta(format.resolution)} (${chalk.green(format.size + ' MB')})`,
							value: format.resolution,
						}))
						.concat([{ name: `${chalk.yellow('Audio')} - ${chalk.magenta('Audio Only')}`, value: 'audio' }]);

					const { selectedFormat } = await inquirer.prompt([
						{
							type: 'list',
							name: 'selectedFormat',
							message: chalk.bold(' Select format to download:'),
							choices,
						},
					]);

					const format = videoInfo.resolutions.find(f => f.resolution === selectedFormat) || { ext: 'mp3', resolution: 'Audio', size: 'Unknown', type: 'audio' };
					console.log(chalk.yellow.bold('\nYou selected:'));
					console.log(`- ${chalk.yellow(format.ext)} - ${chalk.magenta(format.resolution)} (${chalk.green(format.size)})`);

					// start downloading
					if (format.type === 'audio' || options.audio || /music\./.test(options.link)) {
						await api.downloadAudio(options.link, options.output);
					} else {
						const url = new URL(options.link);
						url.searchParams.set('quality', format.resolution);
						await api.downloadVideo(url.toString(), options.output);
					}

					process.exit(1);
				} catch (error) {
					console.error(chalk.red(error.message));
					process.exit(1);
				}
			}

			// Start downloading
			if (!Array.isArray(options.link)) {
				options.link = [options.link];
			}

			const downloadPromises = options.link.map(async link => {
				if (!getVideoId(link)) {
					console.error(chalk.red(`Invalid YouTube link: ${link}`));
					return;
				}

				try {
					if (options.quality === 'audio' || options.audio || /music\./.test(link)) {
						await api.downloadAudio(link, options.output);
					} else {
						const url = new URL(link);

						// If the quality is not set in the URL, append the default quality
						// But skip if the quality is already set in the URL
						// Set the quality to the URL at input .txt file
						if (!url.searchParams.has('quality') || !url.searchParams.has('q')) {
							url.searchParams.append('quality', options.quality);
						}

						await api.downloadVideo(url.toString(), options.output);
					}
				} catch (error) {
					console.error(chalk.red(error.message));
				}
			});

			await Promise.all(downloadPromises);
		});

	const auth = program.command('auth');
	auth
		.command('set <key>')
		.description('Set Your API Key')
		.action(async key => {
			if (!key) {
				console.error(chalk.red('API key is required.'));
				process.exit(1);
			}

			const spinner = ora(` Waiting for Logged In with : ${key}`).start();

			try {
				await api.login(key);

				spinner.succeed(' Logged in successfully!');
			} catch (error) {
				spinner.fail(' Failed to log in, maybe your API key is invalid?');
				process.exit(1);
			}
		});

	auth
		.command('unset')
		.description('Unset Your API Key')
		.action(async () => {
			if (!process.env.API_KEY) {
				console.error('No API key is set.');
				process.exit(1);
			}

			const spinner = ora(' Unsetting API key...').start();

			try {
				await api.logout();

				spinner.succeed(' API key unset successfully!');
			} catch (error) {
				spinner.fail(' Failed to unset API key, maybe you are not logged in?');
				process.exit(1);
			}
		});

	return program;
}

main().then(program => {
	program.parse(process.argv);
});
