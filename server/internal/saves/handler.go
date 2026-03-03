package saves

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/dbccccccc/TypstPad/server/internal/auth"
)

const (
	maxNameLength    = 256
	maxContentLength = 100_000 // ~100KB
)

// Handler handles saved formula HTTP endpoints.
type Handler struct {
	store        *Store
	sessionStore *auth.SessionStore
}

// NewHandler creates a new saves handler.
func NewHandler(store *Store, sessionStore *auth.SessionStore) *Handler {
	return &Handler{store: store, sessionStore: sessionStore}
}

func (h *Handler) requireUser(w http.ResponseWriter, r *http.Request) (string, bool) {
	user, err := h.sessionStore.GetUserFromRequest(r)
	if err != nil {
		log.Printf("session lookup failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "session_error"})
		return "", false
	}
	if user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthenticated"})
		return "", false
	}
	return user.ID, true
}

// List handles GET /account/saves
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	formulas, err := h.store.List(userID)
	if err != nil {
		log.Printf("list saves failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "list_failed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": formulas})
}

// Create handles POST /account/saves
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	var body struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_body"})
		return
	}

	if len(body.Name) > maxNameLength {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "name_too_long"})
		return
	}
	if len(body.Content) > maxContentLength {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "content_too_long"})
		return
	}

	formula, err := h.store.Create(userID, body.Name, body.Content)
	if err != nil {
		log.Printf("create save failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "create_failed"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"item": formula})
}

// Update handles PUT /account/saves/{id}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing_id"})
		return
	}

	var body struct {
		Name    *string `json:"name"`
		Content *string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_body"})
		return
	}

	if body.Name != nil && len(*body.Name) > maxNameLength {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "name_too_long"})
		return
	}
	if body.Content != nil && len(*body.Content) > maxContentLength {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "content_too_long"})
		return
	}

	formula, err := h.store.Update(userID, id, body.Name, body.Content)
	if err != nil {
		log.Printf("update save failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "update_failed"})
		return
	}
	if formula == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not_found"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"item": formula})
}

// Delete handles DELETE /account/saves/{id}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing_id"})
		return
	}

	err := h.store.Delete(userID, id)
	if err != nil {
		if err.Error() == "not_found" {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "not_found"})
			return
		}
		log.Printf("delete save failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "delete_failed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
