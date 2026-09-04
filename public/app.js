(function () {
  const app = document.getElementById('app');
  const pollId = window.location.pathname.split('/poll/')[1];
  const POLL_REFRESH_MS = 5000;

  let refreshTimer = null;
  let selectedOptionId = null;

  function localVoteKey(id) {
    return `poll_voted_${id}`;
  }

  function hasVotedLocally(id) {
    try {
      return Boolean(localStorage.getItem(localVoteKey(id)));
    } catch (e) {
      return false;
    }
  }

  function markVotedLocally(id, optionId) {
    try {
      localStorage.setItem(localVoteKey(id), String(optionId));
    } catch (e) {
      /* localStorage unavailable, cookie still enforces server-side */
    }
  }

  async function fetchPoll() {
    const res = await fetch(`/api/polls/${encodeURIComponent(pollId)}`);
    if (res.status === 404) {
      throw new Error('NOT_FOUND');
    }
    if (!res.ok) {
      throw new Error('FETCH_FAILED');
    }
    return res.json();
  }

  function renderError(message) {
    stopAutoRefresh();
    app.innerHTML = `<p class="error">${message}</p>`;
  }

  function renderVoteForm(poll) {
    const optionsHtml = poll.options
      .map(
        (o) => `
        <label class="option" data-option-id="${o.id}">
          <input type="radio" name="option" value="${o.id}" />
          <span>${o.text}</span>
        </label>`
      )
      .join('');

    app.innerHTML = `
      <h1>${poll.question}</h1>
      <p class="subtitle">Pick your favourite and cast your vote — no login needed.</p>
      <form id="vote-form">
        <div class="options">${optionsHtml}</div>
        <button type="submit" id="vote-btn" disabled>Vote</button>
        <p class="vote-error" id="vote-error" hidden></p>
      </form>
    `;

    const form = document.getElementById('vote-form');
    const voteBtn = document.getElementById('vote-btn');
    const voteError = document.getElementById('vote-error');

    form.addEventListener('change', (e) => {
      if (e.target.name === 'option') {
        selectedOptionId = Number(e.target.value);
        document.querySelectorAll('.option').forEach((el) => {
          el.classList.toggle('selected', Number(el.dataset.optionId) === selectedOptionId);
        });
        voteBtn.disabled = false;
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedOptionId) return;

      voteBtn.disabled = true;
      voteError.hidden = true;

      try {
        const res = await fetch(`/api/polls/${encodeURIComponent(pollId)}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionId: selectedOptionId }),
        });
        const data = await res.json();

        if (!res.ok) {
          voteError.textContent = data.error || 'Something went wrong. Please try again.';
          voteError.hidden = false;
          voteBtn.disabled = false;
          return;
        }

        markVotedLocally(pollId, selectedOptionId);
        renderResults(data);
        startAutoRefresh();
      } catch (err) {
        voteError.textContent = 'Network error — please try again.';
        voteError.hidden = false;
        voteBtn.disabled = false;
      }
    });
  }

  function renderResults(poll) {
    const rows = poll.options
      .map((o) => {
        const isYourVote = poll.votedOptionId === o.id;
        return `
        <div class="result-row">
          <span class="result-label${isYourVote ? ' you-voted' : ''}">${o.text}</span>
          <span class="result-count">${o.votes} vote${o.votes === 1 ? '' : 's'} · ${o.percentage}%</span>
          <div class="bar-track"><div class="bar-fill" style="width:${o.percentage}%"></div></div>
        </div>`;
      })
      .join('');

    const shareUrl = window.location.href;

    app.innerHTML = `
      <h1>${poll.question}</h1>
      <p class="subtitle">Live results${poll.hasVoted ? ' — thanks for voting!' : ''}</p>
      <div class="results">${rows}</div>
      <p class="total-votes">${poll.totalVotes} total vote${poll.totalVotes === 1 ? '' : 's'}</p>
      <div class="share">
        <input type="text" readonly value="${shareUrl}" id="share-url" />
        <button type="button" id="copy-btn">Copy link</button>
      </div>
      <p class="refresh-note">Results refresh automatically every few seconds.</p>
    `;

    const copyBtn = document.getElementById('copy-btn');
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy link'), 1500);
      } catch (e) {
        document.getElementById('share-url').select();
      }
    });
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(async () => {
      try {
        const poll = await fetchPoll();
        renderResults(poll);
      } catch (e) {
        // Silently skip a failed refresh; next tick will retry.
      }
    }, POLL_REFRESH_MS);
  }

  async function init() {
    if (!pollId) {
      renderError('No poll specified.');
      return;
    }

    try {
      const poll = await fetchPoll();

      if (poll.hasVoted || hasVotedLocally(pollId)) {
        renderResults(poll);
        startAutoRefresh();
      } else {
        renderVoteForm(poll);
      }
    } catch (err) {
      if (err.message === 'NOT_FOUND') {
        renderError('This poll does not exist. Double-check the link.');
      } else {
        renderError('Could not load the poll. Please refresh to try again.');
      }
    }
  }

  init();
})();
