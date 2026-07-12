window.alert = function (message) {
  const existing = document.getElementById("app-alert-banner");
  if (existing) {
    existing.remove();
  }

  const banner = document.createElement("div");
  banner.id = "app-alert-banner";
  banner.innerText = message;
  banner.style.position = "fixed";
  banner.style.top = "20px";
  banner.style.left = "50%";
  banner.style.transform = "translateX(-50%) translateY(-20px)";
  banner.style.backgroundColor = "var(--danger)";
  banner.style.color = "white";
  banner.style.padding = "14px 24px";
  banner.style.borderRadius = "8px";
  banner.style.boxShadow =
    "0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)";
  banner.style.zIndex = "999999";
  banner.style.fontWeight = "600";
  banner.style.fontSize = "15px";
  banner.style.textAlign = "center";
  banner.style.minWidth = "280px";
  banner.style.maxWidth = "90%";
  banner.style.opacity = "0";
  banner.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.style.opacity = "1";
    banner.style.transform = "translateX(-50%) translateY(0)";
  }, 10);

  setTimeout(() => {
    banner.style.opacity = "0";
    banner.style.transform = "translateX(-50%) translateY(-20px)";
    setTimeout(() => {
      banner.remove();
    }, 300);
  }, 4000);
};

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
      timerEl.style.display = "block";
      timerEl.innerHTML = `<i class="fa fa-clock-o"></i> Time Remaining: ${state.time_remaining}s`;
      if (state.time_remaining <= 0) {
        timerEl.classList.add("timer-flash");
      } else {
        timerEl.classList.remove("timer-flash");
      }
    } else {
      document.getElementById("game-timer").style.display = "none";
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
      ratingBox.style.display = "block";
      if (state.has_rated_prompt) {
        document.getElementById("rate-up-btn").disabled = true;
        document.getElementById("rate-down-btn").disabled = true;
      } else {
        document.getElementById("rate-up-btn").disabled = false;
        document.getElementById("rate-down-btn").disabled = false;
      }
    } else {
      ratingBox.style.display = "none";
    }

    const isMeStoryteller = state.storyteller_id === userId;
    if (isMeStoryteller) {
      document.getElementById("storyteller-controls").style.display = "block";
      document.getElementById("guesser-controls").style.display = "none";

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
      document.getElementById("storyteller-controls").style.display = "none";
      const guesserBox = document.getElementById("guesser-controls");

      if (state.elapsed < 5) {
        guesserBox.style.display = "none";
      } else if (state.has_voted) {
        guesserBox.innerHTML =
          "<p style='text-align:center; font-weight:600; color:var(--success);'>Your choice is logged. Waiting for cross-examination to finish.</p>";
        guesserBox.style.display = "block";
      } else {
        guesserBox.innerHTML = `
                    <h3 style="margin-top:0;">Cast Your Verdict</h3>
                    <div class="flex-group">
                        <button onclick="submitVote(true)" style="background-color:var(--success);">Truth</button>
                        <button onclick="submitVote(false)" style="background-color:var(--danger);">Lie</button>
                    </div>`;
        guesserBox.style.display = "block";
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
      leaderboardRegion.style.display = "block";
    } else {
      leaderboardRegion.style.display = "none";
    }

    // Session controls buttons display
    const me = state.players.find((p) => p.id === userId);
    if (me) {
      if (me.is_creator) {
        document.getElementById("end-game-btn").style.display = "block";
        document.getElementById("leave-game-btn").style.display = "none";
      } else {
        document.getElementById("end-game-btn").style.display = "none";
        document.getElementById("leave-game-btn").style.display = "block";
      }
    }
  } catch {
    console.warn("Gameplay sync connection dropped...");
  }
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
  await fetch("/api/game/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, user_id: userId, vote: val }),
  });
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
  }
  pollGame();
}
