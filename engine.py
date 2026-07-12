import os
import random
import sqlite3
import string
import time

import config


class GameEngine:
    def __init__(self):
        self.db_is_new = not os.path.exists(config.DB_FILE)
        self.conn = sqlite3.connect(config.DB_FILE, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.init_db()
        self.migrate_db()

    def init_db(self):
        if self.db_is_new:
            print("Initializing backend storage components...")
            with open("schema.sql") as f:
                self.conn.executescript(f.read())
            with open("content.sql") as f:
                self.conn.executescript(f.read())
            self.conn.commit()

    def migrate_db(self):
        cursor = self.get_cursor()
        for col_name, col_type in [
            ("max_time_limit", "INTEGER DEFAULT 60"),
            ("win_score", "INTEGER DEFAULT 5"),
            ("max_rounds", "INTEGER DEFAULT NULL"),
            ("current_round", "INTEGER DEFAULT 0"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE games ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError:
                pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN has_left BOOLEAN DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        self.commit()

    def get_cursor(self):
        return self.conn.cursor()

    def commit(self):
        self.conn.commit()

    def generate_room_code(self) -> str:
        # Generate short 5-character alphanumeric uppercase codes
        chars = string.ascii_uppercase + string.digits
        cursor = self.get_cursor()
        while True:
            code = "".join(random.choices(chars, k=config.ROOM_CODE_LENGTH))
            cursor.execute("SELECT id FROM games WHERE id = ?", (code,))
            if not cursor.fetchone():
                return code

    def advance_round(self, cursor, game_id: str):
        cursor.execute(
            "SELECT id FROM users WHERE game_id = ? AND has_left = 0 ORDER BY RANDOM() LIMIT 1",
            (game_id,),
        )
        storyteller = cursor.fetchone()

        cursor.execute(
            "SELECT id FROM statements WHERE game_id = ? AND used = 0 ORDER BY RANDOM() LIMIT 1",
            (game_id,),
        )
        statement = cursor.fetchone()

        if not statement:
            cursor.execute(
                "UPDATE statements SET used = 0 WHERE game_id = ?", (game_id,)
            )
            cursor.execute(
                "SELECT id FROM statements WHERE game_id = ? AND used = 0 ORDER BY RANDOM() LIMIT 1",
                (game_id,),
            )
            statement = cursor.fetchone()

        if storyteller and statement:
            cursor.execute(
                "UPDATE games SET current_storyteller_id = ?, current_statement_id = ?, round_started_at = ?, current_round = current_round + 1 WHERE id = ?",
                (storyteller["id"], statement["id"], time.time(), game_id),
            )
            cursor.execute("DELETE FROM votes WHERE game_id = ?", (game_id,))


engine = GameEngine()
