const gameId = localStorage.getItem("game_id");
const userId = localStorage.getItem("user_id");
if (!gameId || !userId) window.location.href = "/index.html";

document.getElementById("lobby-code-display").innerText = gameId;
let interval = setInterval(pollLobby, 2000);
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
    if (!res.ok) return;
    const state = await res.json();

    if (state.status === "playing") {
      clearInterval(interval);
      window.location.href = "/game.html";
      return;
    }

    const me = state.players.find((p) => p.id === userId);
    if (me && me.is_creator) {
      document.getElementById("creator-config").style.display = "block";
    }

    const list = document.getElementById("players-list");
    list.innerHTML = state.players
      .map((p) => `<li>${p.username} ${p.is_creator ? "(Host)" : ""}</li>`)
      .join("");
  } catch (e) {
    console.warn("Lobby sync interrupted...");
  }
}

async function submitStatement() {
  const input = document.getElementById("statement-input");
  if (!input.value.trim()) return;
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
  alert("Secret successfully indexed into database!");
}

async function startGame() {
  const categories = [];
  if (document.getElementById("cat-casual").checked) categories.push("Casual");
  if (document.getElementById("cat-work").checked)
    categories.push("Work & School");
  if (document.getElementById("cat-adult").checked) categories.push("Adult");

  const res = await fetch("/api/game/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, user_id: userId, categories }),
  });
  if (!res.ok) alert((await res.json()).detail);
}
