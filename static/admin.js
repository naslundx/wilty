let statementsData = [];

window.onload = () => {
  loadDashboardData();

  const refreshBtn = document.getElementById("refresh-dashboard-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadDashboardData);
  }

  const addBtn = document.getElementById("add-statement-btn");
  if (addBtn) {
    addBtn.addEventListener("click", showAddForm);
  }

  const cancelBtn = document.getElementById("cancel-statement-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", cancelStatementForm);
  }

  const form = document.getElementById("admin-statement-form");
  if (form) {
    form.addEventListener("submit", saveStatement);
  }
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
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No active room records in database.</td></tr>`;
    return;
  }
  tbody.innerHTML = games
    .map(
      (g) => `
        <tr>
            <td><span class="highlight-box padding-4-8">${g.id}</span></td>
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
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No active player nodes online.</td></tr>`;
    return;
  }
  tbody.innerHTML = users
    .map(
      (u) => `
        <tr>
            <td><span class="font-family-monospace font-size-13">${u.id}</span></td>
            <td><span class="highlight-box padding-2-6">${u.game_id}</span></td>
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
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Statement system registry completely empty.</td></tr>`;
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
                <td class="font-style-italic max-width-260 word-wrap-break-word">"${s.text}"</td>
                <td>${s.used ? "Used" : "Available"}</td>
                <td>
                    <span class="vote-count vote-up">+${ups}</span> /
                    <span class="vote-count vote-down">-${downs}</span>
                </td>
                <td>
                    <div class="display-flex gap-6">
                        <button data-action="edit" data-id="${s.id}" class="bg-indigo-500 width-auto padding-6-10 font-size-13"><i class="fa fa-pencil"></i></button>
                        <button data-action="delete" data-id="${s.id}" class="bg-danger width-auto padding-6-10 font-size-13"><i class="fa fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");

  // Add event listeners to the dynamic buttons
  tbody.querySelectorAll("button[data-id]").forEach((btn) => {
    const id = parseInt(btn.getAttribute("data-id"));
    const action = btn.getAttribute("data-action");
    if (action === "edit") {
      btn.addEventListener("click", () => editStatementById(id));
    } else if (action === "delete") {
      btn.addEventListener("click", () => deleteStatement(id));
    }
  });
}

function showAddForm() {
  document.getElementById("form-title").innerText = "Add New Statement";
  document.getElementById("form-statement-id").value = "";
  document.getElementById("form-text").value = "";
  document.getElementById("form-category").value = "Casual";
  document.getElementById("form-game-id").value = "";
  document.getElementById("form-used").checked = false;

  const card = document.getElementById("statement-form-card");
  card.classList.remove("display-none");
  card.classList.add("display-block");
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
  card.classList.remove("display-none");
  card.classList.add("display-block");
  card.scrollIntoView({ behavior: "smooth" });
}

function cancelStatementForm() {
  document
    .getElementById("statement-form-card")
    .classList.remove("display-block");
  document.getElementById("statement-form-card").classList.add("display-none");
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
