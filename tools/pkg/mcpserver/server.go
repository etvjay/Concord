package mcpserver

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Server is a small stdio MCP adapter over Concord's REST control plane. It
// deliberately exposes read resources and unsigned transaction preparation;
// it has no wallet, signer, broadcast, or verifier capability.
type Server struct {
	APIBaseURL string
	HTTPClient *http.Client
	Input      io.Reader
	Output     io.Writer
}

type rpcRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

type toolCallResult struct {
	Content []contentBlock `json:"content"`
	IsError bool           `json:"isError,omitempty"`
}

type contentBlock struct {
	Type     string `json:"type"`
	Text     string `json:"text,omitempty"`
	URI      string `json:"uri,omitempty"`
	MimeType string `json:"mimeType,omitempty"`
}

func (s *Server) Serve(ctx context.Context) error {
	if s.Input == nil || s.Output == nil {
		return fmt.Errorf("MCP input and output are required")
	}
	if s.APIBaseURL == "" {
		return fmt.Errorf("Concord API base URL is required")
	}
	if s.HTTPClient == nil {
		s.HTTPClient = &http.Client{Timeout: 30 * time.Second}
	}
	scanner := bufio.NewScanner(s.Input)
	scanner.Buffer(make([]byte, 1024), 4*1024*1024)
	encoder := json.NewEncoder(s.Output)
	for scanner.Scan() {
		line := bytes.TrimSpace(scanner.Bytes())
		if len(line) == 0 {
			continue
		}
		var request rpcRequest
		if err := json.Unmarshal(line, &request); err != nil {
			if err := encoder.Encode(rpcResponse{JSONRPC: "2.0", Error: &rpcError{Code: -32700, Message: "parse error"}}); err != nil {
				return err
			}
			continue
		}
		response := s.handle(ctx, request)
		// Notifications have no id and do not receive a response.
		if len(request.ID) == 0 || string(request.ID) == "null" {
			continue
		}
		if err := encoder.Encode(response); err != nil {
			return err
		}
	}
	return scanner.Err()
}

func (s *Server) handle(ctx context.Context, request rpcRequest) rpcResponse {
	response := rpcResponse{JSONRPC: "2.0", ID: request.ID}
	result, err := s.dispatch(ctx, request.Method, request.Params)
	if err != nil {
		response.Error = &rpcError{Code: -32602, Message: err.Error()}
		return response
	}
	response.Result = result
	return response
}

func (s *Server) dispatch(ctx context.Context, method string, params json.RawMessage) (any, error) {
	switch method {
	case "initialize":
		return map[string]any{
			"protocolVersion": "2025-06-18",
			"capabilities": map[string]any{
				"resources": map[string]any{"subscribe": false, "listChanged": false},
				"tools":     map[string]any{"listChanged": false},
			},
			"serverInfo": map[string]string{"name": "concord-mcp", "version": "0.1.0"},
		}, nil
	case "ping":
		return map[string]any{}, nil
	case "resources/list":
		return map[string]any{"resources": []any{}, "resourceTemplates": resourceTemplates()}, nil
	case "resources/read":
		var input struct {
			URI string `json:"uri"`
		}
		if err := json.Unmarshal(params, &input); err != nil || input.URI == "" {
			return nil, fmt.Errorf("resources/read requires uri")
		}
		body, err := s.readResource(ctx, input.URI)
		if err != nil {
			return nil, err
		}
		return map[string]any{"contents": []contentBlock{{Type: "resource", URI: input.URI, MimeType: "application/json", Text: string(body)}}}, nil
	case "tools/list":
		return map[string]any{"tools": tools()}, nil
	case "tools/call":
		var input struct {
			Name      string         `json:"name"`
			Arguments map[string]any `json:"arguments"`
		}
		if err := json.Unmarshal(params, &input); err != nil || input.Name == "" {
			return nil, fmt.Errorf("tools/call requires name")
		}
		body, err := s.callTool(ctx, input.Name, input.Arguments)
		if err != nil {
			return toolCallResult{Content: []contentBlock{{Type: "text", Text: err.Error()}}, IsError: true}, nil
		}
		return toolCallResult{Content: []contentBlock{{Type: "text", Text: string(body)}}}, nil
	default:
		return nil, fmt.Errorf("unsupported MCP method %q", method)
	}
}

func resourceTemplates() []map[string]any {
	return []map[string]any{
		{"uriTemplate": "concord://facility/{rootAccordId}", "name": "facility", "description": "Observed Root Accord, round, and child state"},
		{"uriTemplate": "concord://facility/{rootAccordId}/lineage", "name": "facility-lineage", "description": "Observed causal lineage rooted at a Root Accord"},
		{"uriTemplate": "concord://round/{roundId}", "name": "round", "description": "Observed Makkari round metadata without private quotes"},
		{"uriTemplate": "concord://draw/{drawId}", "name": "draw", "description": "Observed draw with explicit DrawLegs"},
	}
}

func tools() []map[string]any {
	return []map[string]any{
		{"name": "get_facility", "description": "Read one Root Accord and its observed children. Private losing quotes remain withheld.", "inputSchema": objectSchema("rootAccordId")},
		{"name": "get_lineage", "description": "Read the causal relationship graph for one Root Accord.", "inputSchema": objectSchema("rootAccordId")},
		{"name": "get_round", "description": "Read one public Makkari round summary without private quote data.", "inputSchema": objectSchema("roundId")},
		{"name": "get_draw", "description": "Read one draw and its explicit child DrawLegs.", "inputSchema": objectSchema("drawId")},
		{"name": "prepare_transaction", "description": "Prepare unsigned calldata for a reviewed action. This tool never signs or broadcasts.", "inputSchema": map[string]any{"type": "object", "required": []string{"action"}, "properties": map[string]any{
			"action":       map[string]any{"type": "string", "enum": []string{"create_root", "lock_collateral", "approve_asset", "fund_child", "draw", "repay"}},
			"rootAccordId": map[string]string{"type": "string"}, "childAccordId": map[string]string{"type": "string"}, "drawId": map[string]string{"type": "string"},
			"targetCapacity": map[string]string{"type": "string"}, "amount": map[string]string{"type": "string"}, "validUntilUnix": map[string]string{"type": "string"},
			"policyHash": map[string]string{"type": "string"}, "asset": map[string]string{"type": "string"}, "spender": map[string]string{"type": "string"},
			"actor": map[string]any{"type": "string", "enum": []string{"treasury", "provider", "institution", "agent"}},
		}}},
	}
}

func objectSchema(property string) map[string]any {
	return map[string]any{"type": "object", "required": []string{property}, "properties": map[string]any{property: map[string]string{"type": "string"}}}
}

func (s *Server) readResource(ctx context.Context, uri string) ([]byte, error) {
	if strings.HasPrefix(uri, "concord://facility/") {
		id := strings.TrimPrefix(uri, "concord://facility/")
		if strings.HasSuffix(id, "/lineage") {
			id = strings.TrimSuffix(id, "/lineage")
			return s.request(ctx, http.MethodGet, "/v1/facilities/"+id+"/lineage", nil)
		}
		return s.request(ctx, http.MethodGet, "/v1/facilities/"+id, nil)
	}
	if strings.HasPrefix(uri, "concord://round/") {
		return s.request(ctx, http.MethodGet, "/v1/rounds/"+strings.TrimPrefix(uri, "concord://round/"), nil)
	}
	if strings.HasPrefix(uri, "concord://draw/") {
		return s.request(ctx, http.MethodGet, "/v1/draws/"+strings.TrimPrefix(uri, "concord://draw/"), nil)
	}
	return nil, fmt.Errorf("unsupported Concord resource URI %q", uri)
}

func (s *Server) callTool(ctx context.Context, name string, args map[string]any) ([]byte, error) {
	var path string
	switch name {
	case "get_facility":
		path = "/v1/facilities/" + stringArg(args, "rootAccordId")
	case "get_lineage":
		path = "/v1/facilities/" + stringArg(args, "rootAccordId") + "/lineage"
	case "get_round":
		path = "/v1/rounds/" + stringArg(args, "roundId")
	case "get_draw":
		path = "/v1/draws/" + stringArg(args, "drawId")
	case "prepare_transaction":
		encoded, err := json.Marshal(args)
		if err != nil {
			return nil, err
		}
		return s.request(ctx, http.MethodPost, "/v1/transactions/prepare", encoded)
	default:
		return nil, fmt.Errorf("unsupported Concord tool %q", name)
	}
	if path == "" || strings.HasSuffix(path, "/<missing>") {
		return nil, fmt.Errorf("tool %s requires its identifier", name)
	}
	return s.request(ctx, http.MethodGet, path, nil)
}

func stringArg(args map[string]any, name string) string {
	value, ok := args[name].(string)
	if !ok || value == "" {
		return "<missing>"
	}
	return value
}

func (s *Server) request(ctx context.Context, method, path string, body []byte) ([]byte, error) {
	if s.HTTPClient == nil {
		s.HTTPClient = &http.Client{Timeout: 30 * time.Second}
	}
	url := strings.TrimRight(s.APIBaseURL, "/") + path
	request, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json")
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := s.HTTPClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	data, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("Concord API returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(data)))
	}
	return data, nil
}
