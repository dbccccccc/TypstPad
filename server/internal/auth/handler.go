package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/dbccccccc/TypstPad/server/internal/db"
)

// HandlerConfig holds configuration for the auth handler.
type HandlerConfig struct {
	GithubClientID     string
	GithubClientSecret string
	BaseURL            string
	SessionStore       *SessionStore
	UserStore          *db.UserStore
	SessionSecret      string
}

// Handler handles authentication HTTP endpoints.
type Handler struct {
	cfg HandlerConfig
}

// NewHandler creates a new auth handler.
func NewHandler(cfg HandlerConfig) *Handler {
	return &Handler{cfg: cfg}
}

func (h *Handler) isSecure() bool {
	return strings.HasPrefix(h.cfg.BaseURL, "https://")
}

func (h *Handler) redirectURI(provider string) string {
	return strings.TrimRight(h.cfg.BaseURL, "/") + "/auth/callback/" + provider
}

func (h *Handler) generateState() string {
	mac := hmac.New(sha256.New, []byte(h.cfg.SessionSecret))
	mac.Write([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	return hex.EncodeToString(mac.Sum(nil))
}

// Login initiates the OAuth login flow.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	provider := r.PathValue("provider")
	if provider != "github" {
		http.Error(w, `{"error":"unsupported_provider"}`, http.StatusBadRequest)
		return
	}

	state := h.generateState()

	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   600, // 10 minutes
		HttpOnly: true,
		Secure:   h.isSecure(),
		SameSite: http.SameSiteLaxMode,
	})

	authorizeURL := BuildGithubAuthorizeURL(h.cfg.GithubClientID, h.redirectURI("github"), state)
	http.Redirect(w, r, authorizeURL, http.StatusTemporaryRedirect)
}

// Callback handles the OAuth callback.
func (h *Handler) Callback(w http.ResponseWriter, r *http.Request) {
	provider := r.PathValue("provider")
	if provider != "github" {
		h.renderCallbackError(w, "unsupported_provider")
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		h.renderCallbackError(w, "missing_code")
		return
	}

	// Exchange code for access token
	accessToken, err := ExchangeGithubCode(
		h.cfg.GithubClientID,
		h.cfg.GithubClientSecret,
		code,
		h.redirectURI("github"),
	)
	if err != nil {
		log.Printf("github token exchange failed: %v", err)
		h.renderCallbackError(w, "token_exchange_failed")
		return
	}

	// Fetch GitHub user info
	ghUser, err := FetchGithubUser(accessToken)
	if err != nil {
		log.Printf("github user fetch failed: %v", err)
		h.renderCallbackError(w, "user_fetch_failed")
		return
	}

	// Upsert user in database
	user, err := h.cfg.UserStore.UpsertFromOAuth(
		"github",
		fmt.Sprintf("%d", ghUser.ID),
		coalesce(ghUser.Name, ghUser.Login),
		ghUser.Email,
		ghUser.AvatarURL,
	)
	if err != nil {
		log.Printf("user upsert failed: %v", err)
		h.renderCallbackError(w, "user_save_failed")
		return
	}

	// Create session
	sessionID, err := h.cfg.SessionStore.Create(user.ID)
	if err != nil {
		log.Printf("session creation failed: %v", err)
		h.renderCallbackError(w, "session_create_failed")
		return
	}

	SetSessionCookie(w, sessionID, h.isSecure())
	h.renderCallbackSuccess(w, user)
}

// Status returns the current authentication status.
func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	user, err := h.cfg.SessionStore.GetUserFromRequest(r)
	if err != nil {
		log.Printf("session lookup failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "session_error"})
		return
	}

	if user == nil {
		writeJSON(w, http.StatusOK, map[string]any{"authenticated": false})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"user":          user,
	})
}

// Logout clears the session.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err == nil && cookie.Value != "" {
		_ = h.cfg.SessionStore.Delete(cookie.Value)
	}

	ClearSessionCookie(w, h.isSecure())
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// renderCallbackSuccess renders a popup callback page that sends the user info to the opener.
func (h *Handler) renderCallbackSuccess(w http.ResponseWriter, user *db.User) {
	userJSON, _ := json.Marshal(user)
	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><title>Login Successful</title></head>
<body>
<p>Login successful. This window will close automatically.</p>
<script>
(function() {
  var user = %s;
  if (window.opener) {
    window.opener.postMessage({type: "ocr-auth-success", user: user}, "*");
  }
  window.close();
})();
</script>
</body>
</html>`, string(userJSON))

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(html))
}

// renderCallbackError renders a popup callback page that sends an error to the opener.
func (h *Handler) renderCallbackError(w http.ResponseWriter, errMsg string) {
	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><title>Login Failed</title></head>
<body>
<p>Login failed: %s</p>
<script>
(function() {
  if (window.opener) {
    window.opener.postMessage({type: "ocr-auth-error", error: %q}, "*");
  }
  window.close();
})();
</script>
</body>
</html>`, errMsg, errMsg)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(html))
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func coalesce(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
