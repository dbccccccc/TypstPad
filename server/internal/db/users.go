package db

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// User represents a registered user.
type User struct {
	ID         string `json:"id"`
	Provider   string `json:"provider"`
	ProviderID string `json:"providerId"`
	Name       string `json:"name,omitempty"`
	Email      string `json:"email,omitempty"`
	AvatarURL  string `json:"avatarUrl,omitempty"`
	CreatedAt  int64  `json:"-"`
	UpdatedAt  int64  `json:"-"`
}

// UserStore provides CRUD operations for users.
type UserStore struct {
	db *sql.DB
}

// NewUserStore returns a new UserStore.
func NewUserStore(db *sql.DB) *UserStore {
	return &UserStore{db: db}
}

// UpsertFromOAuth creates or updates a user from an OAuth provider.
func (s *UserStore) UpsertFromOAuth(provider, providerID, name, email, avatarURL string) (*User, error) {
	now := time.Now().Unix()

	// Try to find existing user
	var user User
	err := s.db.QueryRow(
		`SELECT id, provider, provider_id, name, email, avatar_url, created_at, updated_at
		 FROM users WHERE provider = ? AND provider_id = ?`,
		provider, providerID,
	).Scan(&user.ID, &user.Provider, &user.ProviderID, &user.Name, &user.Email, &user.AvatarURL, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		// Create new user
		user = User{
			ID:         uuid.New().String(),
			Provider:   provider,
			ProviderID: providerID,
			Name:       name,
			Email:      email,
			AvatarURL:  avatarURL,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		_, err = s.db.Exec(
			`INSERT INTO users (id, provider, provider_id, name, email, avatar_url, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			user.ID, user.Provider, user.ProviderID, user.Name, user.Email, user.AvatarURL, user.CreatedAt, user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("insert user: %w", err)
		}
		return &user, nil
	}

	if err != nil {
		return nil, fmt.Errorf("query user: %w", err)
	}

	// Update existing user
	user.Name = name
	user.Email = email
	user.AvatarURL = avatarURL
	user.UpdatedAt = now

	_, err = s.db.Exec(
		`UPDATE users SET name = ?, email = ?, avatar_url = ?, updated_at = ? WHERE id = ?`,
		user.Name, user.Email, user.AvatarURL, user.UpdatedAt, user.ID,
	)
	if err != nil {
		return nil, fmt.Errorf("update user: %w", err)
	}

	return &user, nil
}

// GetByID retrieves a user by ID.
func (s *UserStore) GetByID(id string) (*User, error) {
	var user User
	err := s.db.QueryRow(
		`SELECT id, provider, provider_id, name, email, avatar_url, created_at, updated_at
		 FROM users WHERE id = ?`, id,
	).Scan(&user.ID, &user.Provider, &user.ProviderID, &user.Name, &user.Email, &user.AvatarURL, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return &user, nil
}
