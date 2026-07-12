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
    gameIdInput.addEventListener("keyup", (event) => {
      if (
        event.key === "Enter" &&
        !document.getElementById("join-btn").disabled
      ) {
        joinGame();
      }
    });
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
  const createBtn = document.querySelector("button[onclick='createGame()']");
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
