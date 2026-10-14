# Playlist API (SE4458 - Assignment 2, Group 2)

A simple REST API for a song playlist. Data is stored **in memory** (resets on restart). No frontend, only API + Swagger.

- **Source code:** https://github.com/ozhanklnc/playlist-api
- **Live deployment (Swagger):** https://playlist-api-iod5.onrender.com/api-docs

## Tech stack
Node.js, Express, swagger-ui-express (OpenAPI 3), in-memory array as database.

## Run locally
```bash
npm install
npm start
# http://localhost:3000/api-docs
```

## Endpoints
| Method | URL | Description |
|---|---|---|
| GET | `/songs?search=&genre=&favorite=&sortBy=&order=` | List, search (title/artist/album), filter by genre, sort |
| GET | `/songs/{id}` | Get one song |
| POST | `/songs` | Add a song |
| PUT | `/songs/{id}` | Update a song (only sent fields change) |
| DELETE | `/songs/{id}` | Remove a song |
| PATCH | `/songs/{id}/favorite` | Toggle favorite (or set `{ "favorite": true }`) |
| PATCH | `/songs/{id}/position` | Reorder (drag & drop equivalent) |
| GET | `/playlist/summary` | Total songs + total duration (e.g. "17 min 26 sec") |
| GET | `/genres` | Distinct genres for the dropdown |

`sortBy`: `position` (default), `title`, `artist`, `album`, `duration`. `order`: `asc` / `desc`.

## Design
- Single Express app (`index.js`), OpenAPI spec in `swagger.js`, served at `/api-docs`.
- The songs array order is the playlist order; `position` is computed from the array index.
- Features map to the UI mockup: search bar, sort dropdown, genre dropdown, favorite star, edit, remove, drag-and-drop reorder, header summary.
- Proper status codes: 200, 201, 400 (validation), 404 (not found).

## Assumptions
- `duration` is stored in seconds. Input can be a number (`212`) or a string (`"3:32"`); responses include `durationFormatted`.
- `title`, `artist`, `genre`, `duration` are required; `album` and `favorite` are optional.
- Seed data is the 5 songs from the mockup. No authentication.
- Positions are 1-based.

## Issues encountered
- Swagger UI static files don't load on Vercel serverless with the default setup, so Swagger CSS/JS are loaded from a CDN.
- In-memory data resets on restart/cold start (serverless instances can also be separate), which is expected for this assignment.
- On Render's free plan the service sleeps after inactivity, so the first request can take 30-60 seconds.
- GitHub no longer accepts passwords for git push, so a personal access token was needed.

## AI usage
AI was used to help generate and deploy the project.
