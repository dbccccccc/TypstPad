package saves

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ErrNotFound is returned when a formula is not found or not owned by the user.
var ErrNotFound = errors.New("not_found")

// Formula represents a saved formula.
type Formula struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Content   string `json:"content"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

// Store provides CRUD operations for saved formulas.
type Store struct {
	db *sql.DB
}

// NewStore returns a new formula Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// List returns all saved formulas for a user.
func (s *Store) List(userID string) ([]Formula, error) {
	rows, err := s.db.Query(
		`SELECT id, name, content, created_at, updated_at FROM saved_formulas
		 WHERE user_id = ? ORDER BY updated_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list saves: %w", err)
	}
	defer rows.Close()

	var formulas []Formula
	for rows.Next() {
		var f Formula
		if err := rows.Scan(&f.ID, &f.Name, &f.Content, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan save: %w", err)
		}
		formulas = append(formulas, f)
	}

	if formulas == nil {
		formulas = []Formula{}
	}
	return formulas, rows.Err()
}

// Create creates a new saved formula.
func (s *Store) Create(userID, name, content string) (*Formula, error) {
	now := time.Now().Unix()
	f := Formula{
		ID:        uuid.New().String(),
		Name:      name,
		Content:   content,
		CreatedAt: now,
		UpdatedAt: now,
	}

	_, err := s.db.Exec(
		`INSERT INTO saved_formulas (id, user_id, name, content, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		f.ID, userID, f.Name, f.Content, f.CreatedAt, f.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create save: %w", err)
	}

	return &f, nil
}

// Update updates a saved formula. Only non-empty fields are updated.
func (s *Store) Update(userID, id string, name *string, content *string) (*Formula, error) {
	// Verify ownership
	var f Formula
	err := s.db.QueryRow(
		`SELECT id, name, content, created_at, updated_at FROM saved_formulas
		 WHERE id = ? AND user_id = ?`,
		id, userID,
	).Scan(&f.ID, &f.Name, &f.Content, &f.CreatedAt, &f.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil // not found
	}
	if err != nil {
		return nil, fmt.Errorf("find save: %w", err)
	}

	now := time.Now().Unix()
	if name != nil {
		f.Name = *name
	}
	if content != nil {
		f.Content = *content
	}
	f.UpdatedAt = now

	_, err = s.db.Exec(
		`UPDATE saved_formulas SET name = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
		f.Name, f.Content, f.UpdatedAt, f.ID, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("update save: %w", err)
	}

	return &f, nil
}

// Delete deletes a saved formula.
func (s *Store) Delete(userID, id string) error {
	result, err := s.db.Exec(
		`DELETE FROM saved_formulas WHERE id = ? AND user_id = ?`,
		id, userID,
	)
	if err != nil {
		return fmt.Errorf("delete save: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("check delete result: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}
