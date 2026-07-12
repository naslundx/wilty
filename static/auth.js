window.onload = () => {
  if (localStorage.getItem("game_id") && localStorage.getItem("user_id")) {
    window.location.href = "/lobby";
  }

  // Bind Enter key on username input
  const usernameInput = document.getElementById("username-input");
  if (usernameInput) {
    usernameInput.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        const gameIdInput = document.getElementById("game-id-input");
        if (gameIdInput && gameIdInput.value.trim().length === 5) {
          joinGame();
        } else {
          createGame();
        }
      }
    });
  }

  // Bind Enter key on game-id input
  const gameIdInput = document.getElementById("game-id-input");
  if (gameIdInput) {
    gameIdInput.addEventListener(
      "oninput" in gameIdInput ? "input" : "keyup",
      validateRoomCode,
    );
    gameIdInput.addEventListener("keyup", (event) => {
      if (
        event.key === "Enter" &&
        !document.getElementById("join-btn").disabled
      ) {
        joinGame();
      }
    });
  }

  const createGameBtn = document.getElementById("create-game-btn");
  if (createGameBtn) {
    createGameBtn.addEventListener("click", createGame);
  }

  const joinBtn = document.getElementById("join-btn");
  if (joinBtn) {
    joinBtn.addEventListener("click", joinGame);
  }
};

async function createGame() {
  const username = document.getElementById("username-input").value.trim();
  if (!username) {
    return alert("Please enter a nickname!");
  }

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

  // Prevent double click
  const createBtn = document.getElementById("create-game-btn");
  if (createBtn) {
    createBtn.disabled = true;
    createBtn.innerText = "Creating Room...";
  }

  try {
    const res = await fetch("/api/game/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        max_time_limit: maxTimeLimit,
        win_score: winScore,
        max_rounds: maxRounds,
      }),
    });
    const data = await res.json();
    localStorage.setItem("game_id", data.game_id);
    localStorage.setItem("user_id", data.user_id);
    window.location.href = "/lobby";
  } catch {
    if (createBtn) {
      createBtn.disabled = false;
      createBtn.innerText = "Create New Room";
    }
    alert("Failed to create room. Please try again.");
  }
}

async function joinGame() {
  const username = document.getElementById("username-input").value.trim();
  const gameId = document
    .getElementById("game-id-input")
    .value.trim()
    .toUpperCase();
  if (!username || !gameId) {
    return alert("Both nickname and room code are required!");
  }

  const joinBtn = document.getElementById("join-btn");
  if (joinBtn) {
    joinBtn.disabled = true;
    joinBtn.innerText = "Joining...";
  }

  try {
    const res = await fetch("/api/game/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_id: gameId, username }),
    });

    if (!res.ok) {
      if (joinBtn) {
        joinBtn.disabled = false;
        joinBtn.innerText = "Join Existing Room";
      }
      return alert((await res.json()).detail);
    }
    const data = await res.json();
    localStorage.setItem("game_id", data.game_id);
    localStorage.setItem("user_id", data.user_id);
    window.location.href = "/lobby";
  } catch {
    if (joinBtn) {
      joinBtn.disabled = false;
      joinBtn.innerText = "Join Existing Room";
    }
    alert("Connection error. Failed to join room.");
  }
}

function validateRoomCode() {
  const input = document.getElementById("game-id-input");
  input.value = input.value.toUpperCase(); // Force the actual input value to uppercase!
  const btn = document.getElementById("join-btn");
  const val = input.value.trim();
  btn.disabled = !/^([A-Z0-9]{5})$/.test(val);
}
