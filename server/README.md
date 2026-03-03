# TypstPad Account Server

Go + SQLite backend server handling authentication and account-related features for TypstPad.

## Endpoints

### Authentication (GitHub OAuth)
- `GET /auth/login/github` - Initiate GitHub OAuth flow
- `GET /auth/callback/github` - Handle OAuth callback (popup postMessage flow)
- `GET /auth/status` - Return current session status
- `POST /auth/logout` - Clear session

### Account Saves (CRUD)
- `GET /account/saves` - List saved formulas for authenticated user
- `POST /account/saves` - Create a new saved formula `{name, content}`
- `PUT /account/saves/:id` - Update a saved formula `{name?, content?}`
- `DELETE /account/saves/:id` - Delete a saved formula

### OCR
- `POST /ocr` - Submit an image for math OCR (multipart form, field `image`). Requires authentication. Returns `{text, usage: {count, limit, resetAt}}`

### Health
- `GET /health` - Health check

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3001` |
| `DB_PATH` | SQLite database path | `/data/app.db` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | (required) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | (required) |
| `SESSION_SECRET` | Secret for session signing | `dev-session-secret-change-me` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173` |
| `BASE_URL` | Public URL of this server | `http://localhost:3001` |
| `OCR_API_URL` | External OCR API endpoint | (optional) |
| `OCR_API_KEY` | Bearer token for OCR API | (optional) |
| `OCR_DAILY_LIMIT` | Per-user daily OCR request limit | `50` |

## Development

```bash
# Build
go build -o typstpad-server .

# Run locally
DB_PATH=./dev.db PORT=3001 ./typstpad-server
```

## Docker

```bash
docker build -t typstpad-server .
docker run -p 3001:3001 -v typstpad-data:/data \
  -e GITHUB_CLIENT_ID=xxx \
  -e GITHUB_CLIENT_SECRET=xxx \
  -e BASE_URL=https://your-domain.fly.dev \
  -e ALLOWED_ORIGINS=https://typstpad.com \
  typstpad-server
```
