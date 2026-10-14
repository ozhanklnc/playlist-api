const idParam = { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 1 };
const json = (schema) => ({ "application/json": { schema } });
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const notFound = { description: "Song not found" };

module.exports = {
  openapi: "3.0.0",
  info: {
    title: "Playlist API",
    version: "1.0.0",
    description: "SE4458 Assignment 2 - Group 2 (Playlist). In-memory REST API: CRUD, search, sort, genre filter, favorite, reorder.",
  },
  tags: [{ name: "Songs" }, { name: "Playlist" }],
  paths: {
    "/songs": {
      get: {
        tags: ["Songs"],
        summary: "List songs (search, filter, sort)",
        parameters: [
          { name: "search", in: "query", description: "Searches title, artist and album", schema: { type: "string" } },
          { name: "genre", in: "query", description: "Genre filter (e.g. Pop, R&B). 'All' = no filter", schema: { type: "string" } },
          { name: "favorite", in: "query", schema: { type: "boolean" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["position", "title", "artist", "album", "duration"], default: "position" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: json({ type: "object", properties: { count: { type: "integer" }, songs: { type: "array", items: ref("Song") } } }),
          },
          400: { description: "Invalid sortBy/order" },
        },
      },
      post: {
        tags: ["Songs"],
        summary: "Add a song",
        requestBody: { required: true, content: json(ref("SongInput")) },
        responses: { 201: { description: "Created", content: json(ref("Song")) }, 400: { description: "Validation error" } },
      },
    },
    "/songs/{id}": {
      get: { tags: ["Songs"], summary: "Get a song", parameters: [idParam], responses: { 200: { description: "OK", content: json(ref("Song")) }, 404: notFound } },
      put: {
        tags: ["Songs"],
        summary: "Update a song (only sent fields change)",
        parameters: [idParam],
        requestBody: { required: true, content: json(ref("SongInput")) },
        responses: { 200: { description: "Updated", content: json(ref("Song")) }, 400: { description: "Validation error" }, 404: notFound },
      },
      delete: { tags: ["Songs"], summary: "Remove a song", parameters: [idParam], responses: { 200: { description: "Removed" }, 404: notFound } },
    },
    "/songs/{id}/favorite": {
      patch: {
        tags: ["Songs"],
        summary: "Toggle favorite (or set it explicitly)",
        parameters: [idParam],
        requestBody: { required: false, content: json({ type: "object", properties: { favorite: { type: "boolean", example: true } } }) },
        responses: { 200: { description: "OK", content: json(ref("Song")) }, 404: notFound },
      },
    },
    "/songs/{id}/position": {
      patch: {
        tags: ["Songs"],
        summary: "Move a song to a new position (1-based)",
        parameters: [idParam],
        requestBody: { required: true, content: json({ type: "object", required: ["position"], properties: { position: { type: "integer", example: 3 } } }) },
        responses: { 200: { description: "Full playlist in new order", content: json({ type: "array", items: ref("Song") }) }, 400: { description: "Invalid position" }, 404: notFound },
      },
    },
    "/playlist/summary": {
      get: {
        tags: ["Playlist"],
        summary: "Total songs and total duration",
        responses: {
          200: {
            description: "OK",
            content: json({
              type: "object",
              properties: {
                totalSongs: { type: "integer", example: 5 },
                totalDurationSeconds: { type: "integer", example: 1046 },
                totalDurationFormatted: { type: "string", example: "17 min 26 sec" },
                favorites: { type: "integer", example: 3 },
              },
            }),
          },
        },
      },
    },
    "/genres": { get: { tags: ["Playlist"], summary: "List distinct genres", responses: { 200: { description: "OK", content: json({ type: "array", items: { type: "string" } }) } } } },
  },
  components: {
    schemas: {
      Song: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          title: { type: "string", example: "Blinding Lights" },
          artist: { type: "string", example: "The Weeknd" },
          album: { type: "string", example: "After Hours" },
          duration: { type: "integer", description: "seconds", example: 212 },
          durationFormatted: { type: "string", example: "3:32" },
          genre: { type: "string", example: "Pop" },
          favorite: { type: "boolean", example: true },
          position: { type: "integer", example: 1 },
        },
      },
      SongInput: {
        type: "object",
        required: ["title", "artist", "duration", "genre"],
        properties: {
          title: { type: "string", example: "As It Was" },
          artist: { type: "string", example: "Harry Styles" },
          album: { type: "string", example: "Harry's House" },
          duration: { description: "Seconds (number) or 'm:ss' string", oneOf: [{ type: "integer" }, { type: "string" }], example: "2:47" },
          genre: { type: "string", example: "Pop" },
          favorite: { type: "boolean", example: false },
        },
      },
    },
  },
};
