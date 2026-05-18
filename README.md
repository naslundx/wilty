# Would You Lie to Me? 🤥

A minimalist, framework-free multiplayer party game inspired by the hit TV show. Players submit true secrets, cross-examine a randomly selected storyteller, and vote on whether they are telling the truth or lying.

---

## 🛠️ Technology Stack

*   **Backend:** Python 3.12+, FastAPI, Uvicorn
*   **Database:** SQLite (Persistent `game.db` with automatic schema & seed generation)
*   **Frontend:** Vanilla HTML5, CSS3 (Custom design system), modern Vanilla JavaScript (ES6+)
*   **Package/Environment Management:** `uv` (Extremely fast Python package installer and resolver)

---

## 📁 Project Structure

```text
├── main.py            # FastAPI application, routing, and game loop logic
├── schema.sql         # Core relational database tables
├── content.sql        # Pre-seeded global statements grouped by category
└── static/            # Asset folder served automatically by the backend
    ├── style.css      # Unified application stylesheet
    ├── index.html     # Authentication / Landing page
    ├── auth.js        # Session & authentication handler
    ├── lobby.html     # Room management & configuration interface
    ├── lobby.js       # Category management & polling logic
    ├── game.html      # Active gameplay arena & scoreboards
    ├── game.js        # Core game-loop controller
    ├── finished.html  # Game-over podium rankings
    └── finished.js    # Session-end teardown controller


# 🚀 Getting Started (Using uv)

This project utilizes uv for lightning-fast workspace initialization.
1. Prerequisites

Ensure you have uv installed. If not, install it via curl or pip:
Bash

# macOS/Linux
curl -LsSf [https://astral.sh/uv/install.sh](https://astral.sh/uv/install.sh) | sh

# Windows (PowerShell)
powershell -c "irm [https://astral.sh/uv/install.ps1](https://astral.sh/uv/install.ps1) | iex"

2. Environment Setup

Clone or navigate to your project directory, then create a virtual environment and install dependencies natively with uv:
Bash

# Create a virtual environment
uv venv

# Activate the environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install the lightweight runtime dependencies
uv pip install fastapi uvicorn

🏃‍♂️ How to Run & Test
1. Start the Server

Run the application using Uvicorn. The backend automatically reads schema.sql and content.sql to generate a local game.db file if it doesn't already exist.
Bash

uv run uvicorn main.py:app --reload --host 0.0.0.0 --port 8000

2. Access the Application

Open your web browser and navigate to:
👉 http://localhost:8000
3. Local Testing Loop (Simulating Multi-player)

Because the game uses short-polling and isolates state by browser storage tokens, you can fully test the game loop on a single machine:

Open Browser Window A (e.g., Chrome Normal Mode) -> Enter a nickname and click Create New Room.

Copy the full generated Room UUID String from the landing dashboard.

Open Browser Window B (e.g., Chrome Incognito, Firefox, or Safari) -> Enter a different nickname, paste the UUID string, and click Join Existing Room.

Repeat for as many players as you want to test.

Control the room settings and categories from the host window (Window A) and click Launch Game Loop to begin.
