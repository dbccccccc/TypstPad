package ocr

import (
	"database/sql"
	"fmt"
	"time"
)

// Usage represents a user's OCR usage for the current period.
type Usage struct {
	Count   int   `json:"count"`
	Limit   int   `json:"limit"`
	ResetAt int64 `json:"resetAt"`
}

// UsageStore tracks per-user OCR usage in SQLite.
type UsageStore struct {
	db         *sql.DB
	dailyLimit int
}

// NewUsageStore creates a new UsageStore.
func NewUsageStore(db *sql.DB, dailyLimit int) *UsageStore {
	return &UsageStore{db: db, dailyLimit: dailyLimit}
}

// MigrateUsage creates the usage tracking table.
func MigrateUsage(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS ocr_usage (
		user_id    TEXT NOT NULL,
		used_at    INTEGER NOT NULL,
		PRIMARY KEY (user_id, used_at)
	);
	CREATE INDEX IF NOT EXISTS idx_ocr_usage_user_day ON ocr_usage(user_id, used_at);
	`
	_, err := db.Exec(schema)
	return err
}

// dayBounds returns the start and end of the current UTC day as unix timestamps.
func dayBounds() (int64, int64) {
	now := time.Now().UTC()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)
	return start.Unix(), end.Unix()
}

// GetUsage returns the current usage for a user.
func (s *UsageStore) GetUsage(userID string) (*Usage, error) {
	dayStart, dayEnd := dayBounds()

	var count int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM ocr_usage WHERE user_id = ? AND used_at >= ? AND used_at < ?`,
		userID, dayStart, dayEnd,
	).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("count usage: %w", err)
	}

	return &Usage{
		Count:   count,
		Limit:   s.dailyLimit,
		ResetAt: dayEnd,
	}, nil
}

// Increment records a new OCR usage. Returns an error if the limit is exceeded.
func (s *UsageStore) Increment(userID string) (*Usage, error) {
	usage, err := s.GetUsage(userID)
	if err != nil {
		return nil, err
	}

	if usage.Count >= usage.Limit {
		return usage, fmt.Errorf("limit_exceeded")
	}

	now := time.Now().Unix()
	_, err = s.db.Exec(
		`INSERT INTO ocr_usage (user_id, used_at) VALUES (?, ?)`,
		userID, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert usage: %w", err)
	}

	usage.Count++
	return usage, nil
}

// CleanOldUsage removes usage records older than the retention period.
func (s *UsageStore) CleanOldUsage() error {
	cutoff := time.Now().Add(-48 * time.Hour).Unix()
	_, err := s.db.Exec(`DELETE FROM ocr_usage WHERE used_at < ?`, cutoff)
	return err
}
