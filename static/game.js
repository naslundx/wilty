const gameId = localStorage.getItem("game_id");
const userId = localStorage.getItem("user_id");
if (!gameId || !userId) {
  window.location.href = "/";
}

let currentStatementId = null;
const interval = setInterval(pollGame, 1000); // Poll faster to update the timer smoothly
pollGame();

function clearSessionAndRedirect() {
  clearInterval(interval);
  localStorage.removeItem("game_id");
  localStorage.removeItem("user_id");
  window.location.href = "/";
}

async function pollGame() {
  try {
    const res = await fetch(`/api/game/state/${gameId}/${userId}`);
    if (res.status === 404) {
      clearSessionAndRedirect();
      return;
    }
    if (!res.ok) {
      return;
    }

    const state = await res.json();

    if (state.status === "finished") {
      clearInterval(interval);
      window.location.href = "/finished";
      return;
    }

    currentStatementId = state.statement_id;

    // Render Countdown Timer text
    if (state.time_remaining !== null) {
      const timerEl = document.getElementById("game-timer");
      timerEl.classList.remove("display-none");
      timerEl.classList.add("display-block");
      timerEl.innerHTML = `<i class="fa fa-clock-o"></i> Time Remaining: ${state.time_remaining}s`;
      if (state.time_remaining <= 0) {
        timerEl.classList.add("timer-flash");
      } else {
        timerEl.classList.remove("timer-flash");
      }
    } else {
      document.getElementById("game-timer").classList.remove("display-block");
      document.getElementById("game-timer").classList.add("display-none");
    }

    const currentStoryteller = state.players.find(
      (p) => p.id === state.storyteller_id,
    );
    document.getElementById("storyteller-banner").innerText =
      `Storyteller: ${currentStoryteller ? currentStoryteller.username : "Assigning..."}`;
    document.getElementById("statement-display").innerText =
      `"${state.statement}"`;

    const totalGuessers = state.players.length - 1;
    document.getElementById("vote-summary").innerText =
      `Votes Submitted: ${state.total_votes} / ${totalGuessers}`;

    // Prompt rating rendering context logic
    const ratingBox = document.getElementById("prompt-rating-region");
    if (state.statement_id && state.elapsed >= 5) {
      // Only allow rating after the prep delay reveals it
      ratingBox.classList.remove("display-none");
      ratingBox.classList.add("display-block");
      if (state.has_rated_prompt) {
        document.getElementById("rate-up-btn").disabled = true;
        document.getElementById("rate-down-btn").disabled = true;
      } else {
        document.getElementById("rate-up-btn").disabled = false;
        document.getElementById("rate-down-btn").disabled = false;
      }
    } else {
      ratingBox.classList.remove("display-block");
      ratingBox.classList.add("display-none");
    }

    const isMeStoryteller = state.storyteller_id === userId;
    if (isMeStoryteller) {
      document
        .getElementById("storyteller-controls")
        .classList.remove("display-none");
      document
        .getElementById("storyteller-controls")
        .classList.add("display-block");
      document
        .getElementById("guesser-controls")
        .classList.remove("display-block");
      document.getElementById("guesser-controls").classList.add("display-none");

      // Check resolve condition rules (all voted OR timer out)
      const canResolve =
        state.total_votes >= totalGuessers ||
        (state.time_remaining !== null && state.time_remaining <= 0);
      const trueBtn = document.getElementById("resolve-true-btn");
      const falseBtn = document.getElementById("resolve-false-btn");
      const notice = document.getElementById("storyteller-lock-notice");

      if (canResolve) {
        trueBtn.disabled = false;
        falseBtn.disabled = false;
        notice.innerText = "";
      } else {
        trueBtn.disabled = true;
        falseBtn.disabled = true;
        if (state.max_time_limit > 0) {
          notice.innerText =
            "Locked. Waiting for all guessers to vote or timer expiration.";
        } else {
          notice.innerText = "Locked. Waiting for all guessers to vote.";
        }
      }
    } else {
      document
        .getElementById("storyteller-controls")
        .classList.remove("display-block");
      document
        .getElementById("storyteller-controls")
        .classList.add("display-none");
      const guesserBox = document.getElementById("guesser-controls");

      if (state.elapsed < 5) {
        guesserBox.classList.remove("display-block");
        guesserBox.classList.add("display-none");
      } else if (state.has_voted) {
        guesserBox.innerHTML =
          "<p class='text-center font-weight-600 bg-success'>Your choice is logged. Waiting for cross-examination to finish.</p>";
        guesserBox.classList.remove("display-none");
        guesserBox.classList.add("display-block");
      } else {
        guesserBox.innerHTML = `
                    <h3 class='margin-top-0'>Cast Your Verdict</h3>
                    <div class="flex-group">
                        <button id="vote-true-btn" class='bg-success'>Truth</button>
                        <button id="vote-false-btn" class='bg-danger'>Lie</button>
                    </div>`;
        guesserBox.classList.remove("display-none");
        guesserBox.classList.add("display-block");

        document
          .getElementById("vote-true-btn")
          .addEventListener("click", () => submitVote(true));
        document
          .getElementById("vote-false-btn")
          .addEventListener("click", () => submitVote(false));
      }
    }

    const table = document.getElementById("score-table");
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    table.innerHTML =
      `<tr><th>Player Name</th><th>Current Score</th></tr>` +
      sorted
        .map(
          (p) =>
            `<tr><td>${p.username} ${p.id === state.storyteller_id ? "(Storyteller)" : ""}</td><td><strong>${p.score} pts</strong></td></tr>`,
        )
        .join("");

    // Update leaderboard title with the configured win score
    document.getElementById("leaderboard-title").innerText =
      `Live Leaderboard (First to ${state.win_score} wins)`;

    // Only show leaderboard between game rounds (during prep delay)
    const leaderboardRegion = document.getElementById("leaderboard-region");
    if (state.elapsed < 5) {
      leaderboardRegion.classList.remove("display-none");
      leaderboardRegion.classList.add("display-block");
    } else {
      leaderboardRegion.classList.remove("display-block");
      leaderboardRegion.classList.add("display-none");
    }

    // Session controls buttons display
    const me = state.players.find((p) => p.id === userId);
    if (me) {
      if (me.is_creator) {
        document
          .getElementById("end-game-btn")
          .classList.remove("display-none");
        document.getElementById("end-game-btn").classList.add("display-block");
        document
          .getElementById("leave-game-btn")
          .classList.remove("display-block");
        document.getElementById("leave-game-btn").classList.add("display-none");
      } else {
        document
          .getElementById("end-game-btn")
          .classList.remove("display-block");
        document.getElementById("end-game-btn").classList.add("display-none");
        document
          .getElementById("leave-game-btn")
          .classList.remove("display-none");
        document
          .getElementById("leave-game-btn")
          .classList.add("display-block");
      }
    }
  } catch {
    console.warn("Gameplay sync connection dropped...");
  }
}

// Global Event Listeners
document
  .getElementById("rate-up-btn")
  .addEventListener("click", () => ratePrompt("up"));
document
  .getElementById("rate-down-btn")
  .addEventListener("click", () => ratePrompt("down"));

// Storyteller controls are rendered in the HTML, so we can bind them once
const resTrueBtn = document.getElementById("resolve-true-btn");
if (resTrueBtn) {
  resTrueBtn.addEventListener("click", () => resolveRound(true));
}

const resFalseBtn = document.getElementById("resolve-false-btn");
if (resFalseBtn) {
  resFalseBtn.addEventListener("click", () => resolveRound(false));
}

// Guesser controls in HTML (initial state)
const voteTrueBtn = document.getElementById("vote-true-btn");
if (voteTrueBtn) {
  voteTrueBtn.addEventListener("click", () => submitVote(true));
}

const voteFalseBtn = document.getElementById("vote-false-btn");
if (voteFalseBtn) {
  voteFalseBtn.addEventListener("click", () => submitVote(false));
}

const leaveGameBtn = document.getElementById("leave-game-btn");
if (leaveGameBtn) {
  leaveGameBtn.addEventListener("click", leaveGame);
}

const endGameBtn = document.getElementById("end-game-btn");
if (endGameBtn) {
  endGameBtn.addEventListener("click", endGame);
}

async function leaveGame() {
  if (confirm("Are you sure you want to leave the game?")) {
    const res = await fetch("/api/game/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_id: gameId, user_id: userId }),
    });
    if (res.ok) {
      clearSessionAndRedirect();
    } else {
      alert((await res.json()).detail);
    }
  }
}

async function endGame() {
  if (confirm("Are you sure you want to end the game for everyone?")) {
    const res = await fetch("/api/game/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_id: gameId, user_id: userId }),
    });
    if (res.ok) {
      clearSessionAndRedirect();
    } else {
      alert((await res.json()).detail);
    }
  }
}

async function submitVote(val) {
  const guesserBox = document.getElementById("guesser-controls");
  if (guesserBox) {
    guesserBox.innerHTML =
      "<p class='text-center font-weight-600 text-color-accent'>Your choice is logged. Waiting for cross-examination to finish.</p>";
  }

  try {
    await fetch("/api/game/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_id: gameId, user_id: userId, vote: val }),
    });
  } catch {
    alert("Connection error. Failed to log vote.");
  }
  pollGame();
}

async function ratePrompt(type) {
  if (!currentStatementId) {
    return;
  }
  const res = await fetch("/api/game/rate_prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      statement_id: currentStatementId,
      user_id: userId,
      rating: type,
    }),
  });
  if (res.ok) {
    document.getElementById("rate-up-btn").disabled = true;
    document.getElementById("rate-down-btn").disabled = true;
  }
}

async function resolveRound(actual) {
  const trueBtn = document.getElementById("resolve-true-btn");
  const falseBtn = document.getElementById("resolve-false-btn");
  if (trueBtn) {
    trueBtn.disabled = true;
  }
  if (falseBtn) {
    falseBtn.disabled = true;
  }

  try {
    const res = await fetch("/api/game/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_id: gameId,
        user_id: userId,
        actual_truth: actual,
      }),
    });
    if (!res.ok) {
      alert((await res.json()).detail);
      if (trueBtn) {
        trueBtn.disabled = false;
      }
      if (falseBtn) {
        falseBtn.disabled = false;
      }
    }
  } catch {
    if (trueBtn) {
      trueBtn.disabled = false;
    }
    if (falseBtn) {
      falseBtn.disabled = false;
    }
    alert("Connection error. Failed to resolve round.");
  }
  pollGame();
}
