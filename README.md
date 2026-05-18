WOULD YOU LIE TO ME?

A minimalist multiplayer party game inspired by the television show concept. Players submit true secrets, cross-examine a randomly selected storyteller, and vote on whether the presented statement is a truth or a lie.
========================================================================
CORE GAME FEATURES

    Alphanumeric Room Codes: Rooms use a clean, 5-character uppercase alphanumeric identifier for easy sharing.

    Preparation Delay: Guessers experience a 5-second blind delay at the start of each round, giving the storyteller time to prepare their pitch before the statement is revealed to the room.

    Strategic Action Locking: The storyteller cannot resolve the round until all guessers have submitted their verdicts, or the 60-second round timer expires.

    Prompt Ratings: Players can optionally vote thumbs up or thumbs down once per statement to gather data on the best prompts.

    Central Admin Console: A dedicated management dashboard provides real-time oversight of all live games, player scoring nodes, and global prompt feedback statistics.

========================================================================
PROJECT STRUCTURE

config.py          Central system thresholds, limits, and timing rules
engine.py          Database initialization, room code generation, and round transitions
main.py            FastAPI application routing, state machines, and admin API endpoints
schema.sql         Database schema structure including prompts and rating tables
content.sql        Pre-seeded global fallback statement pools divided by category
static/            Frontend static assets served natively by the backend
style.css      Unified design system stylesheet
index.html     Landing authentication gate
auth.js        Session enrollment and room entry controller
lobby.html     Room lobby configuration page
lobby.js       Category configuration and lobby pooling controller
game.html      Active gameplay arena, feedback options, and timers
game.js        Active game state runner, rating engine, and voting router
finished.html  Game over screen
finished.js    Session termination engine
admin.html     System dashboard panel view
admin.js       Live diagnostic table compiler
========================================================================
LOCAL SETUP (USING UV)

This project leverages uv for high-speed package resolving and environment management.

    Project Environment Initialization

Initialize your local environment and install the required asynchronous runtime dependencies:

Create a virtual environment:
uv venv

Activate the virtual environment:
On macOS/Linux: source .venv/bin/activate
On Windows: .venv\Scripts\activate

Install runtime dependencies:
uv pip install fastapi uvicorn

    Execution

Launch the local development engine using Uvicorn. On its first initialization, the application will automatically read your schema and content files to generate a persistent local game.db file.

uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

Main Application Interface: http://localhost:8000
System Admin Console: http://localhost:8000/admin
========================================================================
PRODUCTION DEPLOYMENT TO HEROKU

Heroku provides native support for uv environments by auto-detecting your dependency mapping files.

    Deployment Requirements

Ensure the following system components are configured accurately at your root folder:

Procfile: Must contain the exact module path command for the ASGI wrapper:
web: uvicorn main:app --host 0.0.0.0 --port $PORT

uv.lock and pyproject.toml: Ensure your lockfile is up to date by running "uv lock" locally before committing.

    Deployment Commands

Execute the following terminal workflow to sync your codebase with your Heroku app remote (assuming your app is named wilty):

Initialize git and stage all project files:
git init
git add main.py engine.py config.py schema.sql content.sql static/ Procfile pyproject.toml uv.lock .gitignore
git commit -m "Deploying game natively with uv tracking"

Link to your existing Heroku application target:
heroku git:remote -a wilty

Push changes to deploy:
git push heroku main

To review system traffic or confirm configuration status during live match execution, tail the environment log outputs:

heroku logs --tail


things to do
-
