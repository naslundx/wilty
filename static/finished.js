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

renderFinals();
