const gameId = localStorage.getItem("game_id");
const userId = localStorage.getItem("user_id");

async function renderFinals() {
  try {
    const res = await fetch(`/api/game/state/${gameId}/${userId}`);
    if (!res.ok) {
      returnHome();
      return;
    }
    const state = await res.json();

    const table = document.getElementById("final-score-table");
    const sorted = [...state.players].sort((a, b) => b.score - a.score);

    table.innerHTML =
      `<tr><th>Rank</th><th>Player Name</th><th>Final Score</th></tr>` +
      sorted
        .map(
          (p, idx) =>
            `<tr><td>#${idx + 1}</td><td>${p.username}</td><td><strong>${p.score} pts</strong></td></tr>`,
        )
        .join("");
  } catch {
    returnHome();
  }
}

function returnHome() {
  localStorage.clear();
  window.location.href = "/";
}

const returnHomeBtn = document.getElementById("return-home-btn");
if (returnHomeBtn) {
  returnHomeBtn.addEventListener("click", returnHome);
}

renderFinals();
