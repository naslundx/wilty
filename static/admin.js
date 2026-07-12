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

let statementsData = [];

window.onload = () => {
  loadDashboardData();
};

async function loadDashboardData() {
  try {
    const res = await fetch("/api/admin/dashboard");
    if (!res.ok) {
      throw new Error("Could not access admin metrics.");
    }
    const data = await res.json();

    statementsData = data.statements;

    renderGamesTable(data.games);
    renderUsersTable(data.users);
    renderStatementsTable(data.statements);
  } catch (err) {
    console.error(err);
    alert("Error synchronizing admin data charts.");
  }
}

function renderGamesTable(games) {
  const tbody = document.querySelector("#admin-games-table tbody");
  if (games.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b;">No active room records in database.</td></tr>`;
    return;
  }
  tbody.innerHTML = games
    .map(
      (g) => `
        <tr>
            <td><span class="highlight-box" style="padding:4px 8px;">${g.id}</span></td>
            <td><span class="badge badge-${g.status}">${g.status}</span></td>
            <td>${g.current_storyteller_id ? g.current_storyteller_id : "None"}</td>
            <td>${g.current_statement_id ? `#${g.current_statement_id}` : "None"}</td>
        </tr>
    `,
    )
    .join("");
}

function renderUsersTable(users) {
  const tbody = document.querySelector("#admin-users-table tbody");
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748b;">No active player nodes online.</td></tr>`;
    return;
  }
  tbody.innerHTML = users
    .map(
      (u) => `
        <tr>
            <td><span style="font-family:monospace; font-size:13px;">${u.id}</span></td>
            <td><span class="highlight-box" style="padding:2px 6px;">${u.game_id}</span></td>
            <td><strong>${u.username}</strong></td>
            <td>${u.score} pts</td>
            <td>${u.is_creator ? "Host" : "Guesser"}</td>
        </tr>
    `,
    )
    .join("");
}

function renderStatementsTable(statements) {
  const tbody = document.querySelector("#admin-statements-table tbody");
  if (statements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b;">Statement system registry completely empty.</td></tr>`;
    return;
  }

  tbody.innerHTML = statements
    .map((s) => {
      const scopeText = s.game_id ? `Room: ${s.game_id}` : "Global Preset";
      const originBadge = s.game_id
        ? `<span class="badge badge-user">User</span>`
        : `<span class="badge badge-system">${s.category}</span>`;

      const ups = s.upvotes || 0;
      const downs = s.downvotes || 0;

      return `
            <tr>
                <td>#${s.id}</td>
                <td>${scopeText}</td>
                <td>${originBadge}</td>
                <td style="font-style:italic; max-width:260px; word-wrap:break-word;">"${s.text}"</td>
                <td>${s.used ? "Used" : "Available"}</td>
                <td>
                    <span class="vote-count vote-up">+${ups}</span> /
                    <span class="vote-count vote-down">-${downs}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="editStatementById(${s.id})" style="width: auto; min-height: auto; padding: 6px 10px; font-size: 13px; background-color: var(--accent);"><i class="fa fa-pencil"></i></button>
                        <button onclick="deleteStatement(${s.id})" style="width: auto; min-height: auto; padding: 6px 10px; font-size: 13px; background-color: var(--danger);"><i class="fa fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

function showAddForm() {
  document.getElementById("form-title").innerText = "Add New Statement";
  document.getElementById("form-statement-id").value = "";
  document.getElementById("form-text").value = "";
  document.getElementById("form-category").value = "Casual";
  document.getElementById("form-game-id").value = "";
  document.getElementById("form-used").checked = false;

  const card = document.getElementById("statement-form-card");
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth" });
}

function editStatementById(id) {
  const s = statementsData.find((item) => item.id === id);
  if (!s) {
    return;
  }

  document.getElementById("form-title").innerText = `Edit Statement #${s.id}`;
  document.getElementById("form-statement-id").value = s.id;
  document.getElementById("form-text").value = s.text;
  document.getElementById("form-category").value = s.category;
  document.getElementById("form-game-id").value = s.game_id || "";
  document.getElementById("form-used").checked = !!s.used;

  const card = document.getElementById("statement-form-card");
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth" });
}

function cancelStatementForm() {
  document.getElementById("statement-form-card").style.display = "none";
}

async function saveStatement(event) {
  event.preventDefault();

  const idVal = document.getElementById("form-statement-id").value;
  const id = idVal ? parseInt(idVal) : null;
  const text = document.getElementById("form-text").value.trim();
  const category = document.getElementById("form-category").value;
  const gameId = document.getElementById("form-game-id").value.trim();
  const used = document.getElementById("form-used").checked;

  if (!text) {
    return alert("Statement text is required!");
  }

  try {
    const res = await fetch("/api/admin/statement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        text,
        category,
        game_id: gameId || null,
        used,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || "Error saving statement asset.");
      return;
    }

    cancelStatementForm();
    await loadDashboardData();
    alert("Statement asset successfully saved!");
  } catch (err) {
    console.error(err);
    alert("Error communicating with server.");
  }
}

async function deleteStatement(id) {
  if (
    confirm(`Are you sure you want to permanently delete Statement #${id}?`)
  ) {
    try {
      const res = await fetch(`/api/admin/statement/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Error deleting statement asset.");
        return;
      }

      await loadDashboardData();
      alert("Statement asset successfully deleted!");
    } catch (err) {
      console.error(err);
      alert("Error communicating with server.");
    }
  }
}
