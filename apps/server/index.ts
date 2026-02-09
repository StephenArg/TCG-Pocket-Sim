// src/index.ts
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';
import { type User } from "@pocket/shared";

const app = express();
app.use(
  cors({
    origin: true, // reflect request origin (allows any origin)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: "*",
    credentials: true,
  })
);
app.use(express.json());

const matcher = new RegExpMatcher({
	...englishDataset.build(),
	...englishRecommendedTransformers,
});
// In-memory store for MVP
const usersByName = new Map<string, User>();

/**
 * POST /api/users
 * Body: { name: string }
 *
 * - If name exists -> 409 + { error: "Name already taken" }
 * - Else -> 200 + { name }
 */
app.post("/api/users", (req, res) => {
  const rawName = req.body?.name;

  if (typeof rawName !== "string") {
    return res.status(400).json({ error: "Username is required" });
  }

  const name = rawName.trim();
  if (!name) {
    return res.status(400).json({ error: "Username is required" });
  }

  if (name.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters long" });
  }
  if (name.length > 16) {
    return res.status(400).json({ error: "Username must be less than 16 characters long" });
  }

  if (matcher.hasMatch(name)) {
    return res.status(400).json({ error: "Username contains profane words. You naughty person." });
  }

  // Normalize (optional). Remove if you want case-sensitive names.
  const key = name.toLowerCase();

  if (usersByName.has(key)) {
    return res.status(409).json({ error: "Name already taken" });
  }

  const user: User = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
  usersByName.set(key, user);

  return res.status(200).json(user);
});

app.get("/api/cards", (req, res) => {
  // send data/all_cards.json to the client
  const cards = fs.readFileSync(path.join(__dirname, "data", "all_cards.json"), "utf8");
  return res.status(200).json(JSON.parse(cards));
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
