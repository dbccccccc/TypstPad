FROM golang:1.22-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 go build -o typstpad-server .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /app/typstpad-server .

EXPOSE 3001

ENV PORT=3001
ENV DB_PATH=/data/app.db

CMD ["./typstpad-server"]
