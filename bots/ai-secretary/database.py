# database.py — SQLite database for AI Secretary Bot
import sqlite3
import os
from datetime import datetime
from typing import Optional

from config import DB_PATH


def get_connection() -> sqlite3.Connection:
    """Get a database connection, creating tables if needed."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    _create_tables(conn)
    return conn


def _create_tables(conn: sqlite3.Connection):
    """Create all tables if they don't exist."""
    cursor = conn.cursor()

    # Users table — track usage quotas
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            free_requests INTEGER DEFAULT 10,
            total_requests INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Reminders table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reminder_text TEXT NOT NULL,
            remind_time TIMESTAMP NOT NULL,
            is_sent INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    # Notes table — meeting/call notes
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            raw_notes TEXT,
            summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    # Schedule table — calendar events
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event TEXT NOT NULL,
            event_time TIMESTAMP NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    conn.commit()


# ─── User operations ───

def get_or_create_user(user_id: int, username: str = "", first_name: str = "") -> dict:
    """Get user or create if new. Returns user dict."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()

    if row:
        # Update last active
        cursor.execute(
            "UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE user_id = ?",
            (user_id,)
        )
        conn.commit()
        user = dict(row)
    else:
        cursor.execute(
            """INSERT INTO users (user_id, username, first_name, free_requests)
               VALUES (?, ?, ?, 10)""",
            (user_id, username, first_name)
        )
        conn.commit()
        user = {
            "user_id": user_id,
            "username": username,
            "first_name": first_name,
            "free_requests": 10,
            "total_requests": 0,
        }

    conn.close()
    return user


def decrement_free_requests(user_id: int) -> int:
    """Decrement free requests, return remaining count."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE users SET free_requests = MAX(0, free_requests - 1), total_requests = total_requests + 1 WHERE user_id = ?",
        (user_id,)
    )
    conn.commit()

    cursor.execute("SELECT free_requests FROM users WHERE user_id = ?", (user_id,))
    remaining = cursor.fetchone()[0]
    conn.close()
    return remaining


def get_user_quota(user_id: int) -> dict:
    """Get user's request quota info."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT free_requests, total_requests FROM users WHERE user_id = ?",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        return {"free_requests": row[0], "total_requests": row[1]}
    return {"free_requests": 10, "total_requests": 0}


# ─── Reminder operations ───

def add_reminder(user_id: int, text: str, remind_time: str) -> int:
    """Add a new reminder. Returns reminder ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO reminders (user_id, reminder_text, remind_time) VALUES (?, ?, ?)",
        (user_id, text, remind_time)
    )
    conn.commit()
    reminder_id = cursor.lastrowid
    conn.close()
    return reminder_id


def get_pending_reminders() -> list[dict]:
    """Get all reminders that haven't been sent yet and are due."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT r.*, u.username, u.first_name
           FROM reminders r
           JOIN users u ON r.user_id = u.user_id
           WHERE r.is_sent = 0 AND r.remind_time <= ?
           ORDER BY r.remind_time""",
        (datetime.now().isoformat(),)
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def mark_reminder_sent(reminder_id: int):
    """Mark a reminder as sent."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE reminders SET is_sent = 1 WHERE id = ?", (reminder_id,))
    conn.commit()
    conn.close()


def get_user_reminders(user_id: int, upcoming_only: bool = True) -> list[dict]:
    """Get reminders for a specific user."""
    conn = get_connection()
    cursor = conn.cursor()

    if upcoming_only:
        cursor.execute(
            """SELECT * FROM reminders
               WHERE user_id = ? AND is_sent = 0 AND remind_time > ?
               ORDER BY remind_time""",
            (user_id, datetime.now().isoformat())
        )
    else:
        cursor.execute(
            "SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_time DESC LIMIT 20",
            (user_id,)
        )

    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


# ─── Notes operations ───

def add_note(user_id: int, title: str, raw_notes: str = "", summary: str = "") -> int:
    """Add a meeting/call note. Returns note ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO notes (user_id, title, raw_notes, summary) VALUES (?, ?, ?, ?)",
        (user_id, title, raw_notes, summary)
    )
    conn.commit()
    note_id = cursor.lastrowid
    conn.close()
    return note_id


def get_user_notes(user_id: int, limit: int = 10) -> list[dict]:
    """Get recent notes for a user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit)
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


# ─── Schedule operations ───

def add_schedule_event(user_id: int, event: str, event_time: str, notes: str = "") -> int:
    """Add a schedule event. Returns event ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO schedule (user_id, event, event_time, notes) VALUES (?, ?, ?, ?)",
        (user_id, event, event_time, notes)
    )
    conn.commit()
    event_id = cursor.lastrowid
    conn.close()
    return event_id


def get_user_schedule(user_id: int, date: str = "") -> list[dict]:
    """Get schedule events for a user, optionally filtered by date."""
    conn = get_connection()
    cursor = conn.cursor()

    if date:
        cursor.execute(
            """SELECT * FROM schedule
               WHERE user_id = ? AND date(event_time) = date(?)
               ORDER BY event_time""",
            (user_id, date)
        )
    else:
        cursor.execute(
            """SELECT * FROM schedule
               WHERE user_id = ? AND event_time >= ?
               ORDER BY event_time LIMIT 20""",
            (user_id, datetime.now().isoformat())
        )

    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows
