const API_BASE = "/api";
let gameId = localStorage.getItem("game_id");
let userId = localStorage.getItem("user_id");
let pollInterval = null;

window.onload = () => {
  if (gameId && userId) {
    startPolling();
  } else {
    showScreen("screen-auth");
  }
};

function showScreen(screenId) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.add("hidden"));
  document.getElementById(screenId).classList.remove("hidden");
}

async function createGame() {
  const username = document.getElementById("username-input").value;
  if (!username) return alert("Enter a username!");

  const res = await fetch(`${API_BASE}/game/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();

  localStorage.setItem("game_id", data.game_id);
  localStorage.setItem("user_id", data.user_id);
  gameId = data.game_id;
  userId = data.user_id;
  startPolling();
}

async function joinGame() {
  const username = document.getElementById("username-input").value;
  const inputId = document.getElementById("game-id-input").value;
  if (!username || !inputId) return alert("Enter both username and game ID!");

  const res = await fetch(`${API_BASE}/game/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: inputId, username }),
  });

  if (!res.ok) {
    const err = await res.json();
    return alert(err.detail);
  }
  const data = await res.json();

  localStorage.setItem("game_id", data.game_id);
  localStorage.setItem("user_id", data.user_id);
  gameId = data.game_id;
  userId = data.user_id;
  startPolling();
}

async function submitStatement() {
  const input = document.getElementById("statement-input");
  if (!input.value) return;

  await fetch(`${API_BASE}/game/statement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_id: gameId,
      user_id: userId,
      text: input.value,
    }),
  });
  input.value = "";
  alert("Statement safely added to your server pool!");
}

async function startGame() {
  const res = await fetch(`${API_BASE}/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, user_id: userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    alert(err.detail);
  }
}

async function submitVote(voteValue) {
  await fetch(`${API_BASE}/game/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, user_id: userId, vote: voteValue }),
  });
}

async function resolveRound(actualTruth) {
  await fetch(`${API_BASE}/game/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_id: gameId,
      user_id: userId,
      actual_truth: actualTruth,
    }),
  });
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollGameData();
  pollInterval = setInterval(pollGameData, 2000);
}

async function pollGameData() {
  if (!gameId || !userId) return;
  try {
    const res = await fetch(`${API_BASE}/game/state/${gameId}/${userId}`);
    if (!res.ok) {
      leaveGame();
      return;
    }
    const state = await res.json();
    renderGame(state);
  } catch (e) {
    console.error("Connection drops in orchestration cycle:", e);
  }
}

function renderGame(state) {
  const me = state.players.find((p) => p.id === userId);

  if (state.status === "waiting") {
    showScreen("screen-lobby");
    document.getElementById("lobby-code-display").innerText = gameId;

    const list = document.getElementById("lobby-players-list");
    list.innerHTML = state.players
      .map((p) => `<li>${p.username} ${p.is_creator ? "👑" : ""}</li>`)
      .join("");

    if (me && me.is_creator) {
      document.getElementById("creator-controls").classList.remove("hidden");
    }
  } else if (state.status === "playing") {
    showScreen("screen-game");
    const isStoryteller = state.storyteller_id === userId;
    const currentStorytellerObj = state.players.find(
      (p) => p.id === state.storyteller_id,
    );

    document.getElementById("storyteller-banner").innerHTML =
      `<h3>Current Storyteller: <span class="highlight">${currentStorytellerObj ? currentStorytellerObj.username : "Unknown"}</span></h3>`;
    document.getElementById("statement-display").innerText =
      `"${state.statement}"`;
    document.getElementById("vote-summary-text").innerText =
      `Total votes in: ${state.total_votes} / ${state.players.length - 1}`;

    if (isStoryteller) {
      document
        .getElementById("storyteller-controls")
        .classList.remove("hidden");
      document.getElementById("guesser-controls").classList.add("hidden");
    } else {
      document.getElementById("storyteller-controls").classList.add("hidden");
      if (state.has_voted) {
        document.getElementById("guesser-controls").innerHTML =
          "<p class='highlight'>✓ Vote logged! Awaiting storyteller response...</p>";
        document.getElementById("guesser-controls").classList.remove("hidden");
      } else {
        document.getElementById("guesser-controls").innerHTML = `
                    <p>Is the storyteller lying or telling the truth?</p>
                    <button onclick="submitVote(true)" class="btn-vote">Truth</button>
                    <button onclick="submitVote(false)" class="btn-vote alert">Lie</button>
                `;
        document.getElementById("guesser-controls").classList.remove("hidden");
      }
    }

    renderScores(state.players, "scores-table");
  } else if (state.status === "finished") {
    showScreen("screen-finished");
    renderScores(state.players, "final-scores-table");
    if (pollInterval) clearInterval(pollInterval);
  }
}

function renderScores(players, tableId) {
  const table = document.getElementById(tableId);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  table.innerHTML = `
        <tr><th>Player</th><th>Score</th></tr>
        ${sorted.map((p) => `<tr><td>${p.username}</td><td><strong>${p.score} pts</strong></td></tr>`).join("")}
    `;
}

function leaveGame() {
  if (pollInterval) clearInterval(pollInterval);
  localStorage.clear();
  gameId = null;
  userId = null;
  showScreen("screen-auth");
}
