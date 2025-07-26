import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import ora from 'ora';
import path from 'path';

import { parseFileName, prettyText } from './parse.js';

class API {
	key;
	request;

	constructor(key) {
		this.key = key;
		this.request = axios.create({
			baseURL: 'https://ytdlpyton.nvlgroup.my.id',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
				'X-Api-Key': this.key,
			},
		});
	}

	async get(endpoint, params = {}) {
		try {
			const response = await this.request.get(endpoint, { params });
			return response.data;
		} catch (error) {
			throw new Error(`API request failed: ${error.response ? error.response.data : error.message}`);
		}
	}

	async post(endpoint, data = {}) {
		try {
			const response = await this.request.post(endpoint, data);
			return response.data;
		} catch (error) {
			throw new Error(`API request failed: ${error.response ? error.response.data : error.message}`);
		}
	}

	async login(key = this.key) {
		if (!key) {
			throw new Error('API key is not set.');
		}

		try {
			const response = await this.request.get('/checkme', {
				headers: {
					'X-Api-Key': key,
				},
				responseType: 'json',
			});

			if (response.data && (response.data.role === 'petualang_gratis' || !response.data.expired)) {
				throw new Error(
					'API key is invalid or does not have access to this service.\n\nBuy a premium key at https://ytdlpyton.nvlgroup.my.id/buyrole'
				);
			}

			this.key = key;
			this.request.defaults.headers['X-Api-Key'] = key;

			// Save the API key to .env file and update process environment
			process.env.API_KEY = key;
			fs.writeFileSync(path.join(process.cwd(), '.env'), `API_KEY=${key}`, 'utf8');

			return response.data;
		} catch (error) {
			throw new Error(`Login failed: ${error.response ? error.response.data : error.message}`);
		}
	}

	async logout() {
		try {
			await this.login(process.env.API_KEY);

			this.key = null;
			delete this.request.defaults.headers['X-Api-Key'];

			// Clear the environment variable and .env file
			process.env.API_KEY = null;
			fs.writeFileSync(path.join(process.cwd(), '.env'), 'API_KEY=', 'utf8');

			return response.data;
		} catch (error) {
			throw new Error(`Logout failed: ${error.response ? error.response.data : error.message}`);
		}
	}

	async downloadVideo(url, dirPath) {
		const param = new URL(url).searchParams;
		if (!param.get('quality')) {
			throw new Error('Quality parameter is required in the URL.');
		}

		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}

		const quality = param.get('quality').replace(/\D+/g, '');
		const spinner = ora(` Downloading URL ${chalk.green(url)} with Quality ${chalk.green(quality)}`).start();

		const response = await this.get('/download', { url: decodeURIComponent(url), resolution: quality, mode: 'url' });
		if (!response.download_url) {
			console.error(chalk.red('Failed to retrieve download URL.'));
			process.exit(1);
		}

		const filePath = path.join(dirPath, `${parseFileName(response.title)} ${quality}.mp4`);
		const writer = fs.createWriteStream(filePath);

		try {
			spinner.text = ` Downloading video "${prettyText(response.title)}"...`;

			const downloadResponse = await axios({
				url: response.download_url,
				method: 'GET',
				responseType: 'stream',
			});

			downloadResponse.data.pipe(writer);

			return new Promise((resolve, reject) => {
				writer.on('finish', () => {
					spinner.succeed(` Download completed: ${filePath}`);
					resolve(filePath);
				});

				writer.on('error', err => {
					spinner.fail(' Download failed.');
					reject(err);
				});
			});
		} catch (error) {
			fs.unlinkSync(filePath); // Clean up the file if download fails
			spinner.fail(' Download failed, maybe the video is not available or the link is invalid?');
			throw new Error('Download failed: ', error.message);
		}
	}

	async downloadAudio(url, dirPath) {
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}

		const spinner = ora(` Downloading URL : ${url}`).start();

		// get the info & download the audio
		const response = await this.get('/download/audio', { url: decodeURIComponent(url), mode: 'url' });

		const filePath = path.join(dirPath, `${parseFileName(response.title)}.mp3`);
		const writer = fs.createWriteStream(filePath);

		try {
			spinner.text = ` Downloading audio "${prettyText(response.title)}"...`;

			const downloadResponse = await axios({
				url: response.download_url,
				method: 'GET',
				responseType: 'stream',
			});

			downloadResponse.data.pipe(writer);

			return new Promise((resolve, reject) => {
				writer.on('finish', () => {
					spinner.succeed(` Download completed: ${filePath}`);
					resolve(filePath);
				});

				writer.on('error', err => {
					spinner.fail(' Download failed.');
					reject(err);
				});
			});
		} catch (error) {
			fs.unlinkSync(filePath); // Clean up the file if download fails
			spinner.fail(' Download failed, maybe the video is not available or the link is invalid?');
			throw new Error('Download failed: ', error.message);
		}
	}
}

export default API;
