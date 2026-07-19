# Would You Lie to Me?

A minimalist multiplayer party game inspired by the TV show concept. Players submit true/false secrets, cross-examine a randomly selected storyteller, and vote on whether the presented statement is a truth or a lie.

---

## Core Game Features

*   **Alphanumeric Room Codes:** Rooms use a clean, 5-character uppercase alphanumeric identifier for easy sharing.
*   **Preparation Delay:** Guessers experience a 5-second blind delay at the start of each round, giving the storyteller time to prepare their pitch before the statement is revealed to the room.
*   **Strategic Action Locking:** The storyteller cannot resolve the round until all guessers have submitted their verdicts, or the 60-second round timer expires.
*   **Prompt Ratings:** Players can optionally vote thumbs up or thumbs down once per statement to gather data on the best prompts.
*   **Central Admin Console:** A dedicated management dashboard provides real-time oversight of all live games, player scoring nodes, and global prompt feedback statistics.

---

## Project Structure

| File/Folder | Description |
| :--- | :--- |
| **`config.py`** | Central system thresholds, limits, and timing rules |
| **`engine.py`** | Database initialization, room code generation, and round transitions |
| **`main.py`** | FastAPI application routing, state machines, and admin API endpoints |
| **`schema.sql`** | Database schema structure including prompts and rating tables |
| **`content.sql`** | Pre-seeded global fallback statement pools divided by category |
| **`static/`** | Frontend static assets served natively by the backend |
| └── **`style.css`** | Unified design system stylesheet |
| └── **`index.html`** / **`auth.js`** | Landing authentication gate & session enrollment controller |
| └── **`lobby.html`** / **`lobby.js`** | Category configuration & room lobby pooling controller |
| └── **`game.html`** / **`game.js`** | Active gameplay arena, feedback options, timers & voting router |
| └── **`finished.html`** / **`finished.js`** | Game over screen & session termination engine |
| └── **`admin.html`** / **`admin.js`** | System dashboard panel view & live diagnostic table compiler |

---

## Local Setup (Using `uv`)

This project leverages `uv` for high-speed package resolving and environment management.

### 1. Project Environment Initialization

Initialize your local environment and install the required asynchronous runtime dependencies:

Create a virtual environment:
```bash
uv venv
```

Activate the virtual environment:
*   **macOS/Linux:** `source .venv/bin/activate`
*   **Windows:** `.venv\Scripts\activate`

Install runtime dependencies:
```bash
uv pip install fastapi uvicorn
```

### 2. Execution

Launch the local development engine using Uvicorn. On its first initialization, the application will automatically read your schema and content files to generate a persistent local `game.db` file.

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

*   **Main Application Interface:** [http://localhost:8000](http://localhost:8000)
*   **System Admin Console:** [http://localhost:8000/admin](http://localhost:8000/admin)

---

## Production Deployment to Heroku

Heroku provides native support for `uv` environments by auto-detecting your dependency mapping files.

### Deployment Requirements

Ensure the following system components are configured accurately at your root folder:

*   **`Procfile`:** Must contain the exact module path command for the ASGI wrapper:
    ```yaml
    web: uvicorn main:app --host 0.0.0.0 --port $PORT
    ```
*   **`uv.lock`** and **`pyproject.toml`:** Ensure your lockfile is up to date by running `uv lock` locally before committing.

### Deployment Commands

Execute the following terminal workflow to sync your codebase with your Heroku app remote (assuming your app is named `wilty`):

Initialize git and stage all project files:
```bash
git init
git add main.py engine.py config.py schema.sql content.sql static/ Procfile pyproject.toml uv.lock .gitignore
git commit -m "Deploying game natively with uv tracking"
```

Link to your existing Heroku application target:
```bash
heroku git:remote -a wilty
```

Push changes to deploy:
```bash
git push heroku main
```

To review system traffic or confirm configuration status during live match execution, tail the environment log outputs:
```bash
heroku logs --tail
```

---

## Future Roadmap & Potential Improvements

Below are suggested enhancements to the "Would You Lie to Me?" engine, categorized by their development complexity and perceived impact on the user experience.

| Improvement | Complexity | Usefulness | Description |
| :--- | :--- | :--- | :--- |
| **Real-time WebSockets** | High | ⭐⭐⭐⭐⭐ | Replace the current HTTP polling mechanism with a WebSocket layer for instant state updates, reducing latency and backend overhead. |
| **AI Prompt Expansion** | Medium-High | ⭐⭐⭐⭐ | Integrate an LLM (e.g., OpenAI/Gemini) to generate context-aware prompts or help players "flesh out" their lies dynamically. |
| **Persistent User Profiles** | Medium | ⭐⭐⭐⭐ | Add a user authentication layer to track lifetime statistics, accuracy percentages, and win/loss records across different rooms. |
| **Audio & Haptic Feedback** | Low | ⭐⭐⭐ | Add localized sound effects for buzzer reveals, round starts, and successful votes, along with device vibration on mobile. |
| **Room Access Controls** | Low-Medium | ⭐⭐⭐ | Implement optional room passwords and "Kick Player" functionality for the host to manage public-facing sessions. |
| **Theme Engine (Dark Mode)** | Low | ⭐⭐ | Expand the CSS utility system to support a "Dark Mode" toggle or custom room color schemes based on the host's preference. |
| **Avatar System** | Medium | ⭐⭐ | Allow players to select or generate simple avatars (e.g., via DiceBear) to make the leaderboard more visually engaging. |
| **Database** | High | * | Move to a postgres DB for persistence. |
