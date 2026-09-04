const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { defaultPollId } = require('./db/database');
const pollRoutes = require('./routes/poll');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect(`/poll/${defaultPollId}`);
});

app.get('/poll/:pollId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'poll.html'));
});

app.use('/api/polls', pollRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Sports poll app running at http://localhost:${PORT}`);
  console.log(`Shareable poll link: http://localhost:${PORT}/poll/${defaultPollId}`);
});
