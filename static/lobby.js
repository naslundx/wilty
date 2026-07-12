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
  window.location.href = "/index.html";
}

document.getElementById("lobby-code-display").innerText = gameId;
const interval = setInterval(pollLobby, 2000);
let currentNumberOfPlayers = 1;
pollLobby();

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
        document.getElementById("creator-config").style.display = "block";
        document.getElementById("end-game-btn").style.display = "block";
        document.getElementById("leave-game-btn").style.display = "none";
      } else {
        document.getElementById("creator-config").style.display = "none";
        document.getElementById("end-game-btn").style.display = "none";
        document.getElementById("leave-game-btn").style.display = "block";
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

async function submitStatement() {
  const input = document.getElementById("statement-input");
  if (!input.value.trim()) {
    return;
  }
  await fetch("/api/game/statement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_id: gameId,
      user_id: userId,
      text: input.value.trim(),
    }),
  });
  input.value = "";
}

async function startGame() {
  if (currentNumberOfPlayers < 2) {
    alert("You need someone to play with!");
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

  const res = await fetch("/api/game/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, user_id: userId, categories }),
  });
  if (!res.ok) {
    alert((await res.json()).detail);
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
