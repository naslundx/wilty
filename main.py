import sqlite3
import time
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import config
from engine import engine

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- API Models ---
class CreateGameReq(BaseModel):
    username: str
    max_time_limit: int = 60
    win_score: int = 5
    max_rounds: int | None = None


class UpdateSettingsReq(BaseModel):
    game_id: str
    user_id: str
    max_time_limit: int
    win_score: int
    max_rounds: int | None


class JoinGameReq(BaseModel):
    game_id: str
    username: str


class StatementReq(BaseModel):
    game_id: str
    user_id: str
    text: str
    is_personal: bool = True


class SkipReq(BaseModel):
    game_id: str
    user_id: str


class StartGameReq(BaseModel):
    game_id: str
    user_id: str
    categories: list[str]


class VoteReq(BaseModel):
    game_id: str
    user_id: str
    vote: bool


class RatePromptReq(BaseModel):
    statement_id: int
    user_id: str
    rating: str  # 'up' or 'down'


class ResolveReq(BaseModel):
    game_id: str
    user_id: str
    actual_truth: bool


class LeaveGameReq(BaseModel):
    game_id: str
    user_id: str


class EndGameReq(BaseModel):
    game_id: str
    user_id: str


class AdminStatementReq(BaseModel):
    id: int | None = None
    text: str
    category: str
    game_id: str | None = None
    used: bool = False


# --- Utility Helpers ---
def get_game_or_404(cursor, game_id: str) -> dict:
    cursor.execute("SELECT * FROM games WHERE id = ?", (game_id,))
    game = cursor.fetchone()
    if not game:
        raise HTTPException(status_code=404, detail="Game session not found.")
    return dict(game)


def get_user_or_404(
    cursor, game_id: str, user_id: str, allow_left: bool = False
) -> dict:
    cursor.execute(
        "SELECT is_creator, username, has_left FROM users WHERE id = ? AND game_id = ?",
        (user_id, game_id),
    )
    user = cursor.fetchone()
    if not user:
        raise HTTPException(
            status_code=404, detail="User session not found in this game."
        )
    if not allow_left and user["has_left"]:
        raise HTTPException(status_code=404, detail="User has left this game.")
    return dict(user)


def verify_host(cursor, game_id: str, user_id: str):
    user = get_user_or_404(cursor, game_id, user_id)
    if not user["is_creator"]:
        raise HTTPException(
            status_code=403,
            detail="Only the room host is authorized to perform this action.",
        )
    return user


# --- Routes ---
@app.post("/api/game/create")
def create_game(req: CreateGameReq):
    if req.win_score <= 0:
        raise HTTPException(
            status_code=400,
            detail="Winning score must be a positive non-zero number.",
        )
    if req.max_time_limit < 0:
        raise HTTPException(
            status_code=400,
            detail="Max round timer cannot be negative.",
        )
    if req.max_rounds is not None and req.max_rounds <= 0:
        raise HTTPException(
            status_code=400,
            detail="Max rounds limit must be a positive non-zero number.",
        )

    game_id = engine.generate_room_code()
    user_id = str(uuid.uuid4())
    cursor = engine.get_cursor()
    cursor.execute(
        "INSERT INTO games (id, max_time_limit, win_score, max_rounds) VALUES (?, ?, ?, ?)",
        (game_id, req.max_time_limit, req.win_score, req.max_rounds),
    )
    cursor.execute(
        "INSERT INTO users (id, game_id, username, is_creator) VALUES (?, ?, ?, 1)",
        (user_id, game_id, req.username),
    )
    engine.commit()
    return {"game_id": game_id, "user_id": user_id}


@app.post("/api/game/settings")
def update_game_settings(req: UpdateSettingsReq):
    cursor = engine.get_cursor()
    verify_host(cursor, req.game_id, req.user_id)

    game = get_game_or_404(cursor, req.game_id)
    if game["status"] != "waiting":
        raise HTTPException(
            status_code=400, detail="Cannot update settings after game has started."
        )

    if req.win_score <= 0:
        raise HTTPException(
            status_code=400,
            detail="Winning score must be a positive non-zero number.",
        )
    if req.max_time_limit < 0:
        raise HTTPException(
            status_code=400,
            detail="Max round timer cannot be negative.",
        )
    if req.max_rounds is not None and req.max_rounds <= 0:
        raise HTTPException(
            status_code=400,
            detail="Max rounds limit must be a positive non-zero number.",
        )

    cursor.execute(
        "UPDATE games SET max_time_limit = ?, win_score = ?, max_rounds = ? WHERE id = ?",
        (req.max_time_limit, req.win_score, req.max_rounds, req.game_id),
    )
    engine.commit()
    return {"status": "success"}


@app.post("/api/game/join")
def join_game(req: JoinGameReq):
    target_code = req.game_id.strip().upper()
    cursor = engine.get_cursor()
    cursor.execute("SELECT id, status FROM games WHERE id = ?", (target_code,))
    game = cursor.fetchone()
    if not game:
        raise HTTPException(status_code=404, detail="Game room code not found.")
    if game["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game session has already started.")

    user_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO users (id, game_id, username) VALUES (?, ?, ?)",
        (user_id, target_code, req.username),
    )
    engine.commit()
    return {"game_id": target_code, "user_id": user_id}


@app.post("/api/game/statement")
def add_statement(req: StatementReq):
    cursor = engine.get_cursor()
    game = get_game_or_404(cursor, req.game_id)
    if game["status"] != "waiting":
        raise HTTPException(
            status_code=400, detail="Cannot add statements after game has started."
        )
    get_user_or_404(cursor, req.game_id, req.user_id)

    cursor.execute(
        "INSERT INTO statements (game_id, user_id, text, category, is_personal) VALUES (?, ?, ?, 'User', ?)",
        (req.game_id, req.user_id, req.text, req.is_personal),
    )
    engine.commit()
    return {"status": "success"}


@app.post("/api/game/skip")
def skip_statement(req: SkipReq):
    cursor = engine.get_cursor()
    game = get_game_or_404(cursor, req.game_id)
    if game["status"] != "playing":
        raise HTTPException(status_code=400, detail="Cannot skip when not playing.")
    if game["current_storyteller_id"] != req.user_id:
        raise HTTPException(status_code=400, detail="Only the storyteller can skip.")

    # Allow skip only during the prep time
    elapsed = time.time() - game["round_started_at"]
    if elapsed >= config.PREP_TIME_LIMIT:
        raise HTTPException(
            status_code=400, detail="Too late to skip. Preparation time is over."
        )

    # Mark the current one as used so it won't appear again soon
    cursor.execute(
        "UPDATE statements SET used = 1 WHERE id = ?", (game["current_statement_id"],)
    )

    # Re-draw a new statement
    cursor.execute(
        "SELECT id FROM statements WHERE game_id = ? AND used = 0 AND (user_id IS NULL OR is_personal = 0 OR user_id = ?) ORDER BY RANDOM() LIMIT 1",
        (req.game_id, req.user_id),
    )
    statement = cursor.fetchone()

    if not statement:
        # If no other statements available, reset used flags and try again
        cursor.execute(
            "UPDATE statements SET used = 0 WHERE game_id = ?", (req.game_id,)
        )
        cursor.execute(
            "SELECT id FROM statements WHERE game_id = ? AND used = 0 AND (user_id IS NULL OR is_personal = 0 OR user_id = ?) ORDER BY RANDOM() LIMIT 1",
            (req.game_id, req.user_id),
        )
        statement = cursor.fetchone()

    if statement:
        cursor.execute(
            "UPDATE games SET current_statement_id = ?, round_started_at = ? WHERE id = ?",
            (statement["id"], time.time(), req.game_id),
        )
        engine.commit()

    return {"status": "skipped"}


@app.post("/api/game/start")
def start_game(req: StartGameReq):
    cursor = engine.get_cursor()
    verify_host(cursor, req.game_id, req.user_id)

    cursor.execute(
        "SELECT COUNT(*) as count FROM users WHERE game_id = ? AND has_left = 0",
        (req.game_id,),
    )
    if cursor.fetchone()["count"] < 2:
        raise HTTPException(
            status_code=400, detail="You need at least 2 players to start."
        )

    if req.categories:
        placeholders = ",".join(["?"] * len(req.categories))
        query = f"INSERT INTO statements (game_id, user_id, text, category) SELECT ?, NULL, text, category FROM statements WHERE game_id IS NULL AND category IN ({placeholders})"
        cursor.execute(query, [req.game_id, *req.categories])

    cursor.execute(
        "SELECT COUNT(*) as count FROM statements WHERE game_id = ?", (req.game_id,)
    )
    if cursor.fetchone()["count"] == 0:
        raise HTTPException(
            status_code=400, detail="Statement pool is empty. Please check a category."
        )

    cursor.execute("UPDATE games SET status = 'playing' WHERE id = ?", (req.game_id,))
    engine.advance_round(cursor, req.game_id)
    engine.commit()
    return {"status": "started"}


@app.get("/api/game/state/{game_id}/{user_id}")
def get_state(game_id: str, user_id: str):
    cursor = engine.get_cursor()
    game = get_game_or_404(cursor, game_id)
    get_user_or_404(cursor, game_id, user_id)

    cursor.execute(
        "SELECT id, username, score, is_creator FROM users WHERE game_id = ? AND has_left = 0",
        (game_id,),
    )
    players = [dict(row) for row in cursor.fetchall()]

    cursor.execute(
        "SELECT id, text FROM statements WHERE id = ?", (game["current_statement_id"],)
    )
    st = cursor.fetchone()

    statement_id = st["id"] if st else None
    statement_text = st["text"] if st else None

    # Timing calculation rules
    now = time.time()
    elapsed = now - game["round_started_at"]
    max_time_limit = game["max_time_limit"] if game["max_time_limit"] is not None else 0

    if max_time_limit > 0:
        time_remaining = max(0, int(max_time_limit - elapsed))
    else:
        time_remaining = None

    # Hide statement from guessers during initial prep delay
    if elapsed < config.PREP_TIME_LIMIT and game["current_storyteller_id"] != user_id:
        statement_text = "Storyteller is preparing... Please wait."

    cursor.execute(
        "SELECT vote FROM votes WHERE game_id = ? AND user_id = ?", (game_id, user_id)
    )
    user_vote = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) as count FROM votes WHERE game_id = ?", (game_id,))
    total_votes = cursor.fetchone()["count"]

    cursor.execute(
        "SELECT rating FROM prompt_ratings WHERE statement_id = ? AND user_id = ?",
        (statement_id, user_id),
    )
    existing_rating = cursor.fetchone()

    return {
        "status": game["status"],
        "storyteller_id": game["current_storyteller_id"],
        "statement_id": statement_id,
        "statement": statement_text,
        "players": players,
        "has_voted": user_vote is not None,
        "total_votes": total_votes,
        "time_remaining": time_remaining,
        "max_time_limit": max_time_limit,
        "win_score": game["win_score"]
        if game["win_score"] is not None
        else config.WIN_SCORE,
        "max_rounds": game["max_rounds"],
        "current_round": game["current_round"],
        "elapsed": elapsed,
        "has_rated_prompt": existing_rating is not None,
    }


@app.post("/api/game/vote")
def post_vote(req: VoteReq):
    cursor = engine.get_cursor()
    game = get_game_or_404(cursor, req.game_id)
    if game["status"] != "playing":
        raise HTTPException(
            status_code=400, detail="Cannot vote. Game session is not actively playing."
        )

    get_user_or_404(cursor, req.game_id, req.user_id)
    if game["current_storyteller_id"] == req.user_id:
        raise HTTPException(
            status_code=400,
            detail="Storyteller is not allowed to vote in their own round.",
        )

    cursor.execute(
        "INSERT OR REPLACE INTO votes (game_id, user_id, vote) VALUES (?, ?, ?)",
        (req.game_id, req.user_id, req.vote),
    )
    engine.commit()
    return {"status": "voted"}


@app.post("/api/game/rate_prompt")
def rate_prompt(req: RatePromptReq):
    if req.rating not in ["up", "down"]:
        raise HTTPException(status_code=400, detail="Invalid rating specification.")
    cursor = engine.get_cursor()

    # Validate that rating user exists
    cursor.execute("SELECT id FROM users WHERE id = ?", (req.user_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="User session not found.")

    try:
        cursor.execute(
            "INSERT INTO prompt_ratings (statement_id, user_id, rating) VALUES (?, ?, ?)",
            (req.statement_id, req.user_id, req.rating),
        )
        engine.commit()
    except sqlite3.IntegrityError as err:
        raise HTTPException(
            status_code=400, detail="You have already rated this statement prompt."
        ) from err
    return {"status": "rated"}


@app.post("/api/game/resolve")
def resolve_round(req: ResolveReq):
    cursor = engine.get_cursor()
    game = get_game_or_404(cursor, req.game_id)
    if game["current_storyteller_id"] != req.user_id:
        raise HTTPException(status_code=403, detail="Unauthorized execution handler.")

    cursor.execute(
        "SELECT id FROM users WHERE game_id = ? AND has_left = 0", (req.game_id,)
    )
    total_players = len(cursor.fetchall())

    cursor.execute(
        "SELECT COUNT(*) as count FROM votes WHERE game_id = ?", (req.game_id,)
    )
    total_votes = cursor.fetchone()["count"]

    elapsed = time.time() - game["round_started_at"]
    max_time_limit = game["max_time_limit"] if game["max_time_limit"] is not None else 0

    # Enforce waiting requirements unless timeout has expired
    if total_votes < (total_players - 1):
        if max_time_limit == 0 or elapsed < max_time_limit:
            raise HTTPException(
                status_code=400,
                detail="Cannot resolve yet. Waiting for other responses or timeout.",
            )

    cursor.execute("SELECT user_id, vote FROM votes WHERE game_id = ?", (req.game_id,))
    for vote in cursor.fetchall():
        if vote["vote"] == req.actual_truth:
            cursor.execute(
                "UPDATE users SET score = score + 1 WHERE id = ?", (vote["user_id"],)
            )

    cursor.execute(
        "UPDATE statements SET used = 1 WHERE id = ?", (game["current_statement_id"],)
    )

    cursor.execute(
        "SELECT MAX(score) as max_score FROM users WHERE game_id = ? AND has_left = 0",
        (req.game_id,),
    )
    max_score = cursor.fetchone()["max_score"] or 0

    win_score_limit = (
        game["win_score"] if game["win_score"] is not None else config.WIN_SCORE
    )

    max_rounds_limit = game["max_rounds"]
    if not max_rounds_limit:
        max_rounds_limit = total_players * 2

    if max_score >= win_score_limit or game["current_round"] >= max_rounds_limit:
        cursor.execute(
            "UPDATE games SET status = 'finished' WHERE id = ?", (req.game_id,)
        )
    else:
        engine.advance_round(cursor, req.game_id)
    engine.commit()
    return {"status": "resolved"}


@app.post("/api/game/leave")
def leave_game(req: LeaveGameReq):
    cursor = engine.get_cursor()
    user = get_user_or_404(cursor, req.game_id, req.user_id)
    if user["is_creator"]:
        raise HTTPException(
            status_code=400, detail="Room creator cannot leave. They must end the game."
        )

    cursor.execute("UPDATE users SET has_left = 1 WHERE id = ?", (req.user_id,))

    game = get_game_or_404(cursor, req.game_id)
    if game["status"] == "playing" and game["current_storyteller_id"] == req.user_id:
        cursor.execute(
            "SELECT id FROM users WHERE game_id = ? AND has_left = 0", (req.game_id,)
        )
        active_players = cursor.fetchall()
        if len(active_players) == 0:
            cursor.execute(
                "UPDATE games SET status = 'finished' WHERE id = ?", (req.game_id,)
            )
        else:
            engine.advance_round(cursor, req.game_id)
    engine.commit()
    return {"status": "left"}


@app.post("/api/game/end")
def end_game(req: EndGameReq):
    cursor = engine.get_cursor()
    verify_host(cursor, req.game_id, req.user_id)

    cursor.execute("UPDATE games SET status = 'finished' WHERE id = ?", (req.game_id,))
    engine.commit()
    return {"status": "ended"}


@app.get("/api/admin/dashboard")
def get_admin_dashboard():
    cursor = engine.get_cursor()
    cursor.execute("SELECT * FROM games")
    games = [dict(row) for row in cursor.fetchall()]

    cursor.execute("SELECT id, game_id, username, score, is_creator FROM users")
    users = [dict(row) for row in cursor.fetchall()]

    cursor.execute("""
        SELECT s.id, s.game_id, s.user_id, s.text, s.category, s.used, s.is_personal,
               SUM(CASE WHEN pr.rating = 'up' THEN 1 ELSE 0 END) as upvotes,
               SUM(CASE WHEN pr.rating = 'down' THEN 1 ELSE 0 END) as downvotes
        FROM statements s
        LEFT JOIN prompt_ratings pr ON s.id = pr.statement_id
        GROUP BY s.id
    """)
    statements = [dict(row) for row in cursor.fetchall()]

    return {"games": games, "users": users, "statements": statements}


@app.post("/api/admin/statement")
def save_admin_statement(req: AdminStatementReq):
    cursor = engine.get_cursor()
    game_id = (
        req.game_id.strip().upper() if req.game_id and req.game_id.strip() else None
    )

    if req.id:
        cursor.execute(
            "UPDATE statements SET text = ?, category = ?, game_id = ?, used = ? WHERE id = ?",
            (req.text, req.category, game_id, 1 if req.used else 0, req.id),
        )
    else:
        cursor.execute(
            "INSERT INTO statements (text, category, game_id, used) VALUES (?, ?, ?, ?)",
            (req.text, req.category, game_id, 1 if req.used else 0),
        )
    engine.commit()
    return {"status": "success"}


@app.delete("/api/admin/statement/{statement_id}")
def delete_admin_statement(statement_id: int):
    cursor = engine.get_cursor()
    cursor.execute("DELETE FROM statements WHERE id = ?", (statement_id,))
    engine.commit()
    return {"status": "deleted"}


@app.get("/lobby")
def serve_lobby_page():
    return FileResponse("static/lobby.html")


@app.get("/game")
def serve_game_page():
    return FileResponse("static/game.html")


@app.get("/finished")
def serve_finished_page():
    return FileResponse("static/finished.html")


@app.get("/admin")
def serve_admin_panel():
    return FileResponse("static/admin.html")


app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
