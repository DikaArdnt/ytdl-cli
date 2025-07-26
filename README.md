# YouTube Audio & Video Downloader CLI

A command-line tool for downloading YouTube videos and audio using [API](https://ytdlpyton.nvlgroup.my.id/).

## Installation

1. Clone the repository:

```bash
git clone https://github.com/DikaArdnt/ytdl-cli
```

2. Go to directory:
```bash
cd ytdl-cli
```

3. Install Package
```bash
npm install
```

4. Install as Global
```
npm install --global
```

## Usage

```bash
ytdl -l https://www.youtube.com/watch?v=fE9trKOuT3Q -i
```

- **Default:** Downloads as medium quality video if no options are provided.
- **Batch Download:** Use a `.txt` file containing links to download multiple videos.
- **YouTube Music:** If the input URL contains `music.youtube.com`, the content will be downloaded as MP3 audio.

## Options

| Option                    | Description                                                                                  |
|---------------------------|----------------------------------------------------------------------------------------------|
| `-v, --version`           | Show version                                                                                 |
| `-l, --link <url>`        | Input URL for the YouTube video or music                                                     |
| `-i, --info`              | Get information about the YouTube video or music                                             |
| `-o, --output <path>`     | Output path for the downloaded folder (default: `downloads`)                                 |
| `-a, --audio`             | Download audio only                                                                          |
| `-q, --quality <quality>` | Set the quality (e.g., 144, 360, 480, 720, 1080, audio) (default: `720`)             |
| `-p, --playlist <url>`    | Get information about the YouTube playlist                                                   |
| `-h, --help`              | Display help for command                                                                     |

## Commands

- `auth set <key>`: Set authentication key.
- `auth unset`: Remove authentication key.

## Input File
```bash
quality=720 # Ex: 360, 720, 144

https://youtu.be/fE9trKOuT3Q?list=RDCMvep1V6rZQ # quality/format following top format
https://music.youtube.com/watch?v=OcFMhdsqCu4 # download as audio, because url contains `music.`
https://music.youtube.com/watch?v=raZ22iX5J18&quality=720 # download as video if exists, following `quality` param
https://youtu.be/T8y_RsF4TSw?list=RDCMvep1V6rZQ&quality=audio # download as music, following `quality` param
```
If you want it to be automatic, delete the topmost part of your .txt file, the `quality=*` part.

## Notes
1. `--info` flags only work when using `--input` flags with 1 url.
2. links from YouTube Music will be downloaded as music even if you use the `--audio` or quality audio flags.
3. `--output` is a folder name, not a file name, the file name will follow the title.
4. use `--info` flags if you want to select the quality provided by the API service.