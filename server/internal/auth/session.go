package auth

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/dbccccccc/TypstPad/server/internal/db"
	"github.com/google/uuid"
)

const (
	sessionCookieName = "session_id"
	sessionDuration   = 30 * 24 * time.Hour // 30 days
)

// SessionStore manages sessions in SQLite.
type SessionStore struct {
	db *sql.DB
}

// NewSessionStore returns a new SessionStore.
func NewSessionStore(database *sql.DB) *SessionStore {
	return &SessionStore{db: database}
}

// Create creates a new session for the given user and returns the session ID.
func (s *SessionStore) Create(userID string) (string, error) {
	id := uuid.New().String()
	now := time.Now().Unix()
	expiresAt := time.Now().Add(sessionDuration).Unix()

	_, err := s.db.Exec(
		`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
		id, userID, now, expiresAt,
	)
	if err != nil {
		return "", fmt.Errorf("create session: %w", err)
	}
	return id, nil
}

// GetUser returns the user for the given session ID, or nil if not found/expired.
func (s *SessionStore) GetUser(sessionID string) (*db.User, error) {
	now := time.Now().Unix()

	var user db.User
	err := s.db.QueryRow(
		`SELECT u.id, u.provider, u.provider_id, u.name, u.email, u.avatar_url, u.created_at, u.updated_at
		 FROM sessions s
		 JOIN users u ON u.id = s.user_id
		 WHERE s.id = ? AND s.expires_at > ?`,
		sessionID, now,
	).Scan(&user.ID, &user.Provider, &user.ProviderID, &user.Name, &user.Email, &user.AvatarURL, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get session user: %w", err)
	}
	return &user, nil
}

// Delete deletes a session by ID.
func (s *SessionStore) Delete(sessionID string) error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// DeleteAllForUser deletes all sessions for a user.
func (s *SessionStore) DeleteAllForUser(userID string) error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE user_id = ?`, userID)
	if err != nil {
		return fmt.Errorf("delete user sessions: %w", err)
	}
	return nil
}

// GetUserFromRequest extracts the session cookie and returns the user.
func (s *SessionStore) GetUserFromRequest(r *http.Request) (*db.User, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		return nil, nil
	}
	return s.GetUser(cookie.Value)
}

// SetSessionCookie sets the session cookie on the response.
func SetSessionCookie(w http.ResponseWriter, sessionID string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    sessionID,
		Path:     "/",
		MaxAge:   int(sessionDuration.Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteNoneMode,
	})
}

// ClearSessionCookie clears the session cookie.
func ClearSessionCookie(w http.ResponseWriter, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteNoneMode,
	})
}

// CleanExpired removes expired sessions from the database.
func (s *SessionStore) CleanExpired() error {
	now := time.Now().Unix()
	_, err := s.db.Exec(`DELETE FROM sessions WHERE expires_at <= ?`, now)
	if err != nil {
		return fmt.Errorf("clean expired sessions: %w", err)
	}
	return nil
}
