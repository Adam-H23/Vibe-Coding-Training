const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

const VOTE_COOKIE_PREFIX = 'poll_voted_';
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

function getPollWithOptions(pollId) {
  const poll = db.prepare('SELECT id, question FROM polls WHERE id = ?').get(pollId);
  if (!poll) return null;

  const options = db
    .prepare('SELECT id, text, votes FROM options WHERE poll_id = ? ORDER BY id')
    .all(pollId);

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  return {
    id: poll.id,
    question: poll.question,
    totalVotes,
    options: options.map((o) => ({
      id: o.id,
      text: o.text,
      votes: o.votes,
      percentage: totalVotes === 0 ? 0 : Math.round((o.votes / totalVotes) * 1000) / 10,
    })),
  };
}

// GET /api/polls/:pollId - poll details + live results
router.get('/:pollId', (req, res) => {
  const poll = getPollWithOptions(req.params.pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  const votedCookie = req.cookies?.[VOTE_COOKIE_PREFIX + poll.id];
  res.json({ ...poll, hasVoted: Boolean(votedCookie), votedOptionId: votedCookie ? Number(votedCookie) : null });
});

// POST /api/polls/:pollId/vote - cast a vote
router.post('/:pollId/vote', (req, res) => {
  const pollId = req.params.pollId;
  const poll = db.prepare('SELECT id FROM polls WHERE id = ?').get(pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  const cookieName = VOTE_COOKIE_PREFIX + pollId;
  if (req.cookies?.[cookieName]) {
    return res.status(409).json({ error: 'You have already voted in this poll' });
  }

  const optionId = Number(req.body?.optionId);
  if (!Number.isInteger(optionId)) {
    return res.status(400).json({ error: 'A valid optionId is required' });
  }

  const option = db
    .prepare('SELECT id FROM options WHERE id = ? AND poll_id = ?')
    .get(optionId, pollId);
  if (!option) {
    return res.status(400).json({ error: 'Invalid option for this poll' });
  }

  db.prepare('UPDATE options SET votes = votes + 1 WHERE id = ?').run(optionId);

  res.cookie(cookieName, String(optionId), {
    maxAge: COOKIE_MAX_AGE_MS,
    httpOnly: false,
    sameSite: 'lax',
  });

  const updatedPoll = getPollWithOptions(pollId);
  res.status(200).json({ ...updatedPoll, hasVoted: true, votedOptionId: optionId });
});

module.exports = router;
