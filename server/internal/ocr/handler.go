package ocr

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/dbccccccc/TypstPad/server/internal/auth"
)

const (
	maxUploadBytes = 6 * 1024 * 1024 // 6 MB
)

// Handler handles OCR HTTP endpoints.
type Handler struct {
	provider     Provider
	usageStore   *UsageStore
	sessionStore *auth.SessionStore
}

// NewHandler creates a new OCR handler.
func NewHandler(provider Provider, usageStore *UsageStore, sessionStore *auth.SessionStore) *Handler {
	return &Handler{
		provider:     provider,
		usageStore:   usageStore,
		sessionStore: sessionStore,
	}
}

// Process handles POST /ocr
func (h *Handler) Process(w http.ResponseWriter, r *http.Request) {
	// Require authentication
	user, err := h.sessionStore.GetUserFromRequest(r)
	if err != nil {
		log.Printf("ocr session lookup failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "session_error"})
		return
	}
	if user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthenticated"})
		return
	}

	// Check and increment usage
	usage, err := h.usageStore.Increment(user.ID)
	if err != nil {
		if err.Error() == "limit_exceeded" {
			writeJSON(w, http.StatusTooManyRequests, map[string]any{
				"error": "limit_exceeded",
				"usage": usage,
			})
			return
		}
		log.Printf("ocr usage check failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "usage_error"})
		return
	}

	// Parse multipart form with size limit
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]any{
			"error": "file_too_large",
		})
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing_image"})
		return
	}
	defer file.Close()

	// Read image data
	imageData, err := io.ReadAll(file)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "read_failed"})
		return
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Process OCR
	result, err := h.provider.Process(imageData, contentType)
	if err != nil {
		log.Printf("ocr processing failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"error": "ocr_failed",
			"usage": usage,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"text":  result.Text,
		"usage": usage,
	})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
