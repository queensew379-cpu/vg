# Video Grabber

YouTube / TikTok / Instagram / Facebook video downloader — Node.js + Express + yt-dlp.

## Setup

```bash
npm install

# yt-dlp must be installed on the server (not an npm package)
pip install -U yt-dlp
# or: sudo apt install yt-dlp

npm start
```

Open http://localhost:3000

## Deploy on Render (recommended free option)

1. Push this folder to a GitHub repo.
2. On Render: New → Web Service → connect the repo.
3. Build command: `pip install -U yt-dlp && npm install`
4. Start command: `npm start`
5. Add environment: Python + Node buildpack (Render auto-detects Node; add a `render-build.sh` if yt-dlp isn't found — see below).

If yt-dlp isn't available in the build image, add this `render-build.sh`:
```bash
#!/usr/bin/env bash
apt-get update && apt-get install -y python3-pip
pip3 install -U yt-dlp
npm install
```
and set Build Command to `bash render-build.sh`.

## Notes
- Instagram/Facebook private or login-required content won't work without cookies — pass `--cookies cookies.txt` to yt-dlp in `server.js` if needed.
- Respect each platform's terms of service; only download content you have rights to.
