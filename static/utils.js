// Global state variables
window.gameId = localStorage.getItem("game_id");
window.userId = localStorage.getItem("user_id");

// Beautiful custom alert override that uses a modal/banner at the top of the viewport
window.alert = function (message) {
  const existing = document.getElementById("app-alert-banner");
  if (existing) {
    existing.remove();
  }

  const banner = document.createElement("div");
  banner.id = "app-alert-banner";
  banner.className = "alert-banner";
  banner.innerText = message;

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.classList.add("visible");
  }, 10);

  setTimeout(() => {
    banner.classList.remove("visible");
    setTimeout(() => {
      banner.remove();
    }, 300);
  }, 4000);
};

function clearSessionAndRedirect() {
  localStorage.removeItem("game_id");
  localStorage.removeItem("user_id");
  window.location.href = "/";
}

async function leaveGame() {
  if (confirm("Are you sure you want to leave the game?")) {
    const gameId = localStorage.getItem("game_id");
    const userId = localStorage.getItem("user_id");
    try {
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
    } catch {
      alert("Connection error. Failed to leave game.");
    }
  }
}

async function endGame() {
  if (confirm("Are you sure you want to end the game for everyone?")) {
    const gameId = localStorage.getItem("game_id");
    const userId = localStorage.getItem("user_id");
    try {
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
    } catch {
      alert("Connection error. Failed to end game.");
    }
  }
}

window.clearSessionAndRedirect = clearSessionAndRedirect;
window.leaveGame = leaveGame;
window.endGame = endGame;
