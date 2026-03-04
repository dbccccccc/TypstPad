package ocr

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os/exec"
	"strings"
)

// Result represents the output from an OCR provider.
type Result struct {
	Text string `json:"text"`
}

// Provider processes images and returns extracted text.
type Provider interface {
	Process(imageData []byte, contentType string) (*Result, error)
}

// TesseractProvider uses local Tesseract for OCR.
type TesseractProvider struct{}

// NewTesseractProvider creates a TesseractProvider.
func NewTesseractProvider() *TesseractProvider {
	return &TesseractProvider{}
}

// Process runs Tesseract OCR on the image data.
func (p *TesseractProvider) Process(imageData []byte, contentType string) (*Result, error) {
	cmd := exec.Command("tesseract", "-", "-", "--oem", "1", "-l", "eng+equ")
	cmd.Stdin = bytes.NewReader(imageData)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("tesseract failed: %w (stderr: %s)", err, stderr.String())
	}

	text := strings.TrimSpace(stdout.String())
	return &Result{Text: text}, nil
}

// ExternalAPIProvider calls an external OCR API.
type ExternalAPIProvider struct {
	apiURL string
	apiKey string
}

// NewExternalAPIProvider creates an ExternalAPIProvider.
func NewExternalAPIProvider(apiURL, apiKey string) *ExternalAPIProvider {
	return &ExternalAPIProvider{apiURL: apiURL, apiKey: apiKey}
}

// Process sends the image to the external API for OCR.
func (p *ExternalAPIProvider) Process(imageData []byte, contentType string) (*Result, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile("image", "upload")
	if err != nil {
		return nil, fmt.Errorf("create form file: %w", err)
	}
	if _, err := io.Copy(part, bytes.NewReader(imageData)); err != nil {
		return nil, fmt.Errorf("write image data: %w", err)
	}
	writer.Close()

	req, err := http.NewRequest("POST", p.apiURL, &body)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if p.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+p.apiKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("api request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("api returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result Result
	if err := json.Unmarshal(respBody, &result); err != nil {
		// Try to extract text from a different format
		var raw map[string]interface{}
		if err2 := json.Unmarshal(respBody, &raw); err2 == nil {
			if text, ok := raw["text"].(string); ok {
				return &Result{Text: text}, nil
			}
		}
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &result, nil
}

// NoopProvider always returns an error indicating OCR is not configured.
type NoopProvider struct{}

// NewNoopProvider creates a NoopProvider.
func NewNoopProvider() *NoopProvider {
	return &NoopProvider{}
}

// Process always returns an error.
func (p *NoopProvider) Process(imageData []byte, contentType string) (*Result, error) {
	return nil, fmt.Errorf("ocr_not_configured")
}
