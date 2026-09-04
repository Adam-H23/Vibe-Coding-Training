const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'poll.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id TEXT NOT NULL REFERENCES polls(id),
    text TEXT NOT NULL,
    votes INTEGER NOT NULL DEFAULT 0
  );
`);

const DEFAULT_QUESTION = 'What is your favourite sport?';
const DEFAULT_OPTIONS = [
  'Cricket',
  'Tennis',
  'Athletics',
  'Swimming',
  'Cycling',
  'Football',
  'Rugby',
  'Gaelic Football',
  'Kabbadi',
  'Buzkashi',
  'One of the nonsense American ones',
];

function seedDefaultPoll() {
  const existing = db.prepare('SELECT id FROM polls LIMIT 1').get();
  if (existing) return existing.id;

  const pollId = crypto.randomBytes(6).toString('hex');
  const insertPoll = db.prepare('INSERT INTO polls (id, question) VALUES (?, ?)');
  const insertOption = db.prepare('INSERT INTO options (poll_id, text) VALUES (?, ?)');

  const seed = db.transaction(() => {
    insertPoll.run(pollId, DEFAULT_QUESTION);
    for (const text of DEFAULT_OPTIONS) {
      insertOption.run(pollId, text);
    }
  });
  seed();

  return pollId;
}

const defaultPollId = seedDefaultPoll();

module.exports = { db, defaultPollId };
