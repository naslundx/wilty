window.onload = () => {
  if (localStorage.getItem("game_id") && localStorage.getItem("user_id")) {
    window.location.href = "/lobby.html";
  }
};

async function createGame() {
  const username = document.getElementById("username-input").value.trim();
  if (!username) return alert("Please enter a nickname!");

  const res = await fetch("/api/game/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  localStorage.setItem("game_id", data.game_id);
  localStorage.setItem("user_id", data.user_id);
  window.location.href = "/lobby.html";
}

async function joinGame() {
  const username = document.getElementById("username-input").value.trim();
  const gameId = document
    .getElementById("game-id-input")
    .value.trim()
    .toUpperCase();
  if (!username || !gameId)
    return alert("Both nickname and room code are required!");

  const res = await fetch("/api/game/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, username }),
  });

  if (!res.ok) return alert((await res.json()).detail);
  const data = await res.json();
  localStorage.setItem("game_id", data.game_id);
  localStorage.setItem("user_id", data.user_id);
  window.location.href = "/lobby.html";
}
