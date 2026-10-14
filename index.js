const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const spec = require("./swagger");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- In-memory database ----------
// Dizideki sıra = playlist sırası (position)
let songs = [
  { id: 1, title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: 212, genre: "Pop", favorite: true },
  { id: 2, title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", duration: 220, genre: "Pop", favorite: false },
  { id: 3, title: "Watermelon Sugar", artist: "Harry Styles", album: "Fine Line", duration: 214, genre: "Pop", favorite: true },
  { id: 4, title: "Save Your Tears", artist: "The Weeknd", album: "After Hours", duration: 246, genre: "R&B", favorite: false },
  { id: 5, title: "Peaches", artist: "Justin Bieber", album: "Justice", duration: 154, genre: "Pop", favorite: true },
];
let nextId = 6;

// ---------- Helpers ----------
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

const view = (song) => ({
  ...song,
  position: songs.indexOf(song) + 1,
  durationFormatted: fmt(song.duration),
});

// 212 veya "3:32" kabul eder, saniye döner. Geçersizse null.
function parseDuration(v) {
  if (typeof v === "number" && Number.isInteger(v) && v > 0) return v;
  if (typeof v === "string") {
    const m = v.match(/^(\d+):([0-5]\d)$/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    if (/^\d+$/.test(v) && Number(v) > 0) return Number(v);
  }
  return null;
}

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const findSong = (req) => songs.find((s) => s.id === Number(req.params.id));
const notFound = (res) => res.status(404).json({ error: "Song not found" });

// ---------- Routes ----------
app.get("/", (req, res) => res.redirect("/api-docs"));

// List + search + filter + sort
app.get("/songs", (req, res) => {
  const { search, genre, favorite, sortBy = "position", order = "asc" } = req.query;
  const allowed = ["position", "title", "artist", "album", "duration"];
  if (!allowed.includes(sortBy)) return res.status(400).json({ error: `sortBy must be one of: ${allowed.join(", ")}` });
  if (!["asc", "desc"].includes(order)) return res.status(400).json({ error: "order must be asc or desc" });

  let result = songs.map(view);

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter((s) => [s.title, s.artist, s.album].some((f) => (f || "").toLowerCase().includes(q)));
  }
  if (genre && genre.toLowerCase() !== "all") {
    result = result.filter((s) => s.genre.toLowerCase() === String(genre).toLowerCase());
  }
  if (favorite !== undefined) {
    result = result.filter((s) => s.favorite === (String(favorite) === "true"));
  }

  result.sort((a, b) => {
    const x = a[sortBy], y = b[sortBy];
    const cmp = typeof x === "number" ? x - y : String(x).localeCompare(String(y), undefined, { sensitivity: "base" });
    return order === "desc" ? -cmp : cmp;
  });

  res.json({ count: result.length, songs: result });
});

// Summary: "5 songs • 17 min 26 sec"
app.get("/playlist/summary", (req, res) => {
  const total = songs.reduce((t, s) => t + s.duration, 0);
  res.json({
    totalSongs: songs.length,
    totalDurationSeconds: total,
    totalDurationFormatted: `${Math.floor(total / 60)} min ${total % 60} sec`,
    favorites: songs.filter((s) => s.favorite).length,
  });
});

// Distinct genres (for the genre dropdown)
app.get("/genres", (req, res) => {
  res.json([...new Set(songs.map((s) => s.genre))].sort());
});

app.get("/songs/:id", (req, res) => {
  const song = findSong(req);
  if (!song) return notFound(res);
  res.json(view(song));
});

// Create
app.post("/songs", (req, res) => {
  const { title, artist, album = "", genre, favorite = false } = req.body || {};
  const duration = parseDuration(req.body && req.body.duration);
  const errors = [];
  if (!isStr(title)) errors.push("title is required");
  if (!isStr(artist)) errors.push("artist is required");
  if (!isStr(genre)) errors.push("genre is required");
  if (duration === null) errors.push("duration must be seconds (number) or 'm:ss'");
  if (typeof favorite !== "boolean") errors.push("favorite must be boolean");
  if (errors.length) return res.status(400).json({ errors });

  const song = { id: nextId++, title: title.trim(), artist: artist.trim(), album: String(album).trim(), duration, genre: genre.trim(), favorite };
  songs.push(song);
  res.status(201).json(view(song));
});

// Update (sadece gönderilen alanlar değişir)
app.put("/songs/:id", (req, res) => {
  const song = findSong(req);
  if (!song) return notFound(res);
  const body = req.body || {};
  const errors = [];

  ["title", "artist", "genre"].forEach((f) => {
    if (body[f] !== undefined && !isStr(body[f])) errors.push(`${f} must be a non-empty string`);
  });
  if (body.album !== undefined && typeof body.album !== "string") errors.push("album must be a string");
  if (body.favorite !== undefined && typeof body.favorite !== "boolean") errors.push("favorite must be boolean");
  let duration;
  if (body.duration !== undefined) {
    duration = parseDuration(body.duration);
    if (duration === null) errors.push("duration must be seconds (number) or 'm:ss'");
  }
  if (errors.length) return res.status(400).json({ errors });

  ["title", "artist", "album", "genre"].forEach((f) => {
    if (body[f] !== undefined) song[f] = body[f].trim();
  });
  if (duration !== undefined) song.duration = duration;
  if (body.favorite !== undefined) song.favorite = body.favorite;
  res.json(view(song));
});

// Delete
app.delete("/songs/:id", (req, res) => {
  const song = findSong(req);
  if (!song) return notFound(res);
  songs = songs.filter((s) => s !== song);
  res.json({ message: `"${song.title}" by ${song.artist} removed from the playlist`, song });
});

// Favorite toggle (body'de {"favorite": true} gönderilirse onu set eder)
app.patch("/songs/:id/favorite", (req, res) => {
  const song = findSong(req);
  if (!song) return notFound(res);
  const f = req.body && req.body.favorite;
  song.favorite = typeof f === "boolean" ? f : !song.favorite;
  res.json(view(song));
});

// Reorder (drag & drop karşılığı), position 1-based
app.patch("/songs/:id/position", (req, res) => {
  const song = findSong(req);
  if (!song) return notFound(res);
  const pos = req.body && req.body.position;
  if (!Number.isInteger(pos) || pos < 1 || pos > songs.length) {
    return res.status(400).json({ error: `position must be an integer between 1 and ${songs.length}` });
  }
  songs.splice(songs.indexOf(song), 1);
  songs.splice(pos - 1, 0, song);
  res.json(songs.map(view));
});

// ---------- Swagger ----------
// CDN kullanıyoruz, böylece Vercel'de de statik dosya sorunu olmaz.
const CDN = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0";
app.use(
  "/api-docs",
  swaggerUi.serveFiles(spec),
  swaggerUi.setup(spec, {
    customCssUrl: `${CDN}/swagger-ui.css`,
    customJs: [`${CDN}/swagger-ui-bundle.js`, `${CDN}/swagger-ui-standalone-preset.js`],
  })
);
app.get("/swagger.json", (req, res) => res.json(spec));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Playlist API running: http://localhost:${PORT}/api-docs`));
}

module.exports = app;
