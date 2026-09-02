const express = require("express");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Basic URL guard - only allow known platforms
const ALLOWED_HOSTS = [
  "youtube.com", "youtu.be",
  "tiktok.com",
  "instagram.com",
  "facebook.com", "fb.watch"
];

function isAllowedUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
    });
  });
}

// Get video info + available formats
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url || !isAllowedUrl(url)) {
    return res.status(400).json({ error: "Invalid or unsupported URL" });
  }
  try {
    const out = await runYtDlp(["-j", "--no-playlist", url]);
    const info = JSON.parse(out.trim().split("\n")[0]);
    const formats = (info.formats || [])
      .filter((f) => f.url && (f.vcodec !== "none" || f.acodec !== "none"))
      .map((f) => ({
        format_id: f.format_id,
        ext: f.ext,
        resolution: f.resolution || (f.height ? `${f.height}p` : "audio"),
        filesize: f.filesize || f.filesize_approx || null,
        note: f.format_note || ""
      }));
    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      uploader: info.uploader,
      formats: formats.length ? formats : [{ format_id: "best", ext: "mp4", resolution: "best", note: "Best available" }]
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch video info", detail: err.message });
  }
});

// Stream the actual download to the browser
app.get("/api/download", (req, res) => {
  const { url, format_id } = req.query;
  if (!url || !isAllowedUrl(url)) {
    return res.status(400).send("Invalid or unsupported URL");
  }
  const fmt = format_id && format_id !== "undefined" ? format_id : "best";

  res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
  res.setHeader("Content-Type", "video/mp4");

  const proc = spawn("yt-dlp", ["-f", fmt, "--no-playlist", "-o", "-", url]);
  proc.stdout.pipe(res);
  proc.stderr.on("data", () => {}); // swallow yt-dlp logs
  proc.on("error", () => {
    if (!res.headersSent) res.status(500).end("Download failed");
  });
  req.on("close", () => proc.kill());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
