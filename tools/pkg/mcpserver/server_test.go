package mcpserver

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestServeSupportsResourcesAndReadTools(t *testing.T) {
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"state":"ACTIVE"},"meta":{"observation":{"status":"observed"}}}`))
	}))
	defer api.Close()

	id := "0x" + strings.Repeat("1", 64)
	input := strings.NewReader(fmt.Sprintf(
		"%s\n%s\n%s\n",
		`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}`,
		`{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"concord://facility/`+id+`"}}`,
		`{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_facility","arguments":{"rootAccordId":"`+id+`"}}}`,
	))
	var output strings.Builder
	server := &Server{APIBaseURL: api.URL, Input: input, Output: &output}
	if err := server.Serve(context.Background()); err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(output.String()), "\n")
	if len(lines) != 3 {
		t.Fatalf("expected 3 responses, got %d: %s", len(lines), output.String())
	}
	if !strings.Contains(output.String(), "protocolVersion") || !strings.Contains(output.String(), "ACTIVE") {
		t.Fatalf("unexpected MCP output: %s", output.String())
	}
}

func TestServeSupportsHealthAndEvidenceSurfaces(t *testing.T) {
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{},"meta":{"observation":{"status":"not_observed"}}}`))
	}))
	defer api.Close()

	input := strings.NewReader(
		`{"jsonrpc":"2.0","id":1,"method":"resources/list","params":{}}` + "\n" +
		`{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"concord://health"}}` + "\n" +
		`{"jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"concord://evidence/0x1111111111111111111111111111111111111111111111111111111111111111"}}` + "\n" +
		`{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_evidence","arguments":{"resultDigest":"0x1111111111111111111111111111111111111111111111111111111111111111"}}}` + "\n",
	)
	var output strings.Builder
	server := &Server{APIBaseURL: api.URL, Input: input, Output: &output}
	if err := server.Serve(context.Background()); err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(output.String()), "\n")
	if len(lines) != 4 {
		t.Fatalf("expected 4 responses, got %d: %s", len(lines), output.String())
	}
	if !strings.Contains(output.String(), "concord://evidence/{resultDigest}") {
		t.Fatalf("resource list omitted evidence template: %s", output.String())
	}
}
