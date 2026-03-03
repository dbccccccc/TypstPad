package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/dbccccccc/TypstPad/server/internal/auth"
	"github.com/dbccccccc/TypstPad/server/internal/db"
	"github.com/dbccccccc/TypstPad/server/internal/middleware"
	"github.com/dbccccccc/TypstPad/server/internal/saves"
)

func main() {
	dbPath := envOr("DB_PATH", "/data/app.db")
	port := envOr("PORT", "3001")
	allowedOrigins := strings.Split(envOr("ALLOWED_ORIGINS", "http://localhost:5173"), ",")
	baseURL := envOr("BASE_URL", "http://localhost:3001")
	ghClientID := os.Getenv("GITHUB_CLIENT_ID")
	ghClientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	sessionSecret := envOr("SESSION_SECRET", "dev-session-secret-change-me")

	if ghClientID == "" || ghClientSecret == "" {
		log.Println("WARNING: GITHUB_CLIENT_ID and/or GITHUB_CLIENT_SECRET not set; OAuth will fail")
	}

	database, err := db.Open(dbPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer database.Close()

	if err := db.Migrate(database); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	sessionStore := auth.NewSessionStore(database)
	userStore := db.NewUserStore(database)
	saveStore := saves.NewStore(database)

	cors := middleware.CORS(allowedOrigins)

	authHandler := auth.NewHandler(auth.HandlerConfig{
		GithubClientID:     ghClientID,
		GithubClientSecret: ghClientSecret,
		BaseURL:            baseURL,
		SessionStore:       sessionStore,
		UserStore:          userStore,
		SessionSecret:      sessionSecret,
	})

	savesHandler := saves.NewHandler(saveStore, sessionStore)

	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("GET /auth/login/{provider}", authHandler.Login)
	mux.HandleFunc("GET /auth/callback/{provider}", authHandler.Callback)
	mux.HandleFunc("GET /auth/status", authHandler.Status)
	mux.HandleFunc("POST /auth/logout", authHandler.Logout)

	// Account saves routes
	mux.HandleFunc("GET /account/saves", savesHandler.List)
	mux.HandleFunc("POST /account/saves", savesHandler.Create)
	mux.HandleFunc("PUT /account/saves/{id}", savesHandler.Update)
	mux.HandleFunc("DELETE /account/saves/{id}", savesHandler.Delete)

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	handler := cors(mux)

	log.Printf("server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
