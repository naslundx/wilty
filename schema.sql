CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    current_storyteller_id TEXT,
    current_statement_id INTEGER,
    round_started_at REAL DEFAULT 0.0,
    max_time_limit INTEGER DEFAULT 60,
    win_score INTEGER DEFAULT 5,
    max_rounds INTEGER DEFAULT NULL,
    current_round INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    game_id TEXT,
    username TEXT,
    score INTEGER DEFAULT 0,
    is_creator BOOLEAN DEFAULT 0,
    has_left BOOLEAN DEFAULT 0,
    FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT,
    user_id TEXT,
    text TEXT,
    category TEXT, -- 'Casual', 'Work & School', 'Adult'
    used BOOLEAN DEFAULT 0,
    FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS votes (
    game_id TEXT,
    user_id TEXT,
    vote BOOLEAN,
    PRIMARY KEY (game_id, user_id),
    FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prompt_ratings (
    statement_id INTEGER,
    user_id TEXT,
    rating TEXT, -- 'up' or 'down'
    PRIMARY KEY (statement_id, user_id),
    FOREIGN KEY(statement_id) REFERENCES statements(id) ON DELETE CASCADE
);
