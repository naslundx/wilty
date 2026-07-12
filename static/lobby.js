const gameId = localStorage.getItem("game_id");
const userId = localStorage.getItem("user_id");
if (!gameId || !userId) {
  window.location.href = "/index.html";
}

document.getElementById("lobby-code-display").innerText = gameId;
const interval = setInterval(pollLobby, 2000);
let currentNumberOfPlayers = 1;
pollLobby();

// Bind Enter key on statement input
const statementInput = document.getElementById("statement-input");
if (statementInput) {
  statementInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      submitStatement();
    }
  });
}

const submitStatementBtn = document.getElementById("submit-statement-btn");
if (submitStatementBtn) {
  submitStatementBtn.addEventListener("click", submitStatement);
}

const startGameBtn = document.getElementById("start-game-btn");
if (startGameBtn) {
  startGameBtn.addEventListener("click", startGame);
}

const leaveGameBtn = document.getElementById("leave-game-btn");
if (leaveGameBtn) {
  leaveGameBtn.addEventListener("click", leaveGame);
}

const updateSettingsBtn = document.getElementById("update-settings-btn");
if (updateSettingsBtn) {
  updateSettingsBtn.addEventListener("click", updateSettings);
}

const endGameBtn = document.getElementById("end-game-btn");
if (endGameBtn) {
  endGameBtn.addEventListener("click", endGame);
}

function clearSessionAndRedirect() {
  clearInterval(interval);
  localStorage.removeItem("game_id");
  localStorage.removeItem("user_id");
  window.location.href = "/index.html";
}

async function pollLobby() {
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

    if (state.status === "playing") {
      clearInterval(interval);
      window.location.href = "/game.html";
      return;
    }

    if (state.status === "finished") {
      clearInterval(interval);
      window.location.href = "/finished";
      return;
    }

    const me = state.players.find((p) => p.id === userId);
    if (me) {
      if (me.is_creator) {
        document
          .getElementById("creator-config")
          .classList.remove("display-none");
        document
          .getElementById("creator-config")
          .classList.add("display-block");
        document
          .getElementById("game-details-card")
          .classList.add("display-none");
        document
          .getElementById("game-details-card")
          .classList.remove("display-block");

        // Populate inputs if not already focused (to avoid interrupting user typing)
        const timeInput = document.getElementById("max-time-limit");
        const scoreInput = document.getElementById("win-score");
        const roundsInput = document.getElementById("max-rounds");

        if (document.activeElement !== timeInput)
          {timeInput.value = state.max_time_limit;}
        if (document.activeElement !== scoreInput)
          {scoreInput.value = state.win_score;}
        if (document.activeElement !== roundsInput)
          {roundsInput.value = state.max_rounds || "";}

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
          .getElementById("creator-config")
          .classList.remove("display-block");
        document.getElementById("creator-config").classList.add("display-none");

        document
          .getElementById("game-details-card")
          .classList.remove("display-none");
        document
          .getElementById("game-details-card")
          .classList.add("display-block");

        const details = document.getElementById("game-details-content");
        details.innerHTML = `
            <div><strong>Max Round Timer:</strong> ${state.max_time_limit > 0 ? state.max_time_limit / 60 + "m" : "No Timer"}</div>
            <div><strong>Winning Score:</strong> ${state.win_score} points</div>
            <div><strong>Max Rounds:</strong> ${state.max_rounds || "Default (Players × 2)"}</div>
        `;

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

    const list = document.getElementById("players-list");
    currentNumberOfPlayers = state.players.length;
    list.innerHTML = state.players
      .map((p) => `<li>${p.username} ${p.is_creator ? "(Host)" : ""}</li>`)
      .join("");
  } catch {
    console.warn("Lobby sync interrupted...");
  }
}

async function updateSettings() {
  const maxTimeLimit =
    parseInt(document.getElementById("max-time-limit").value) || 0;
  const winScoreInput = document.getElementById("win-score").value.trim();
  const winScore = winScoreInput ? parseInt(winScoreInput) : 5;
  if (isNaN(winScore) || winScore <= 0) {
    return alert("Winning score must be a positive non-zero number!");
  }

  const maxRoundsInput = document.getElementById("max-rounds").value.trim();
  const maxRounds = maxRoundsInput ? parseInt(maxRoundsInput) || null : null;
  if (maxRounds !== null && (isNaN(maxRounds) || maxRounds <= 0)) {
    return alert("Max rounds limit must be a positive non-zero number!");
  }

  const btn = document.getElementById("update-settings-btn");
  btn.disabled = true;
  btn.innerText = "Updating...";

  try {
    const res = await fetch("/api/game/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_id: gameId,
        user_id: userId,
        max_time_limit: maxTimeLimit,
        win_score: winScore,
        max_rounds: maxRounds,
      }),
    });
    if (res.ok) {
      alert("Settings updated successfully!");
    } else {
      alert((await res.json()).detail);
    }
  } catch {
    alert("Failed to update settings.");
  } finally {
    btn.disabled = false;
    btn.innerText = "Update Settings";
  }
}

async function submitStatement() {
  const input = document.getElementById("statement-input");
  const text = input.value.trim();
  if (!text) {
    return;
  }
  await fetch("/api/game/statement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_id: gameId,
      user_id: userId,
      text: text,
    }),
  });
  input.value = "";
  alert("Secret statement successfully added to your room's custom pool!");
}

async function startGame() {
  if (currentNumberOfPlayers < 2) {
    return alert("You need someone to play with!");
  }

  const startBtn = document.getElementById("start-game-btn");
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerText = "Starting Match...";
  }

  const categories = [];
  if (document.getElementById("cat-casual").checked) {
    categories.push("Casual");
  }
  if (document.getElementById("cat-work").checked) {
    categories.push("Work & School");
  }
  if (document.getElementById("cat-adult").checked) {
    categories.push("Adult");
  }

  try {
    const res = await fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_id: gameId, user_id: userId, categories }),
    });
    if (!res.ok) {
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerText = "Start!";
      }
      alert((await res.json()).detail);
    }
  } catch {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerText = "Start!";
    }
    alert("Connection error. Failed to start game.");
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
