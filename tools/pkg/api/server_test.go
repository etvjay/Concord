package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"concord/tools/pkg/readmodel"
	"github.com/ethereum/go-ethereum/common"
)

type fakeReader struct {
	facility readmodel.Facility
	round    readmodel.Round
	draw     readmodel.Draw
	lineage  readmodel.Lineage
}

func (f fakeReader) Facility(context.Context, [32]byte) (readmodel.Facility, error) {
	return f.facility, nil
}
func (f fakeReader) Round(context.Context, [32]byte) (readmodel.Round, error) { return f.round, nil }
func (f fakeReader) Draw(context.Context, [32]byte) (readmodel.Draw, error)   { return f.draw, nil }
func (f fakeReader) Lineage(context.Context, [32]byte) (readmodel.Lineage, error) {
	return f.lineage, nil
}

func testServer(t *testing.T) *httptest.Server {
	t.Helper()
	facilityID := "0x" + strings.Repeat("1", 64)
	server, err := NewServer(fakeReader{
		facility: readmodel.Facility{
			ID:                facilityID,
			Borrower:          "0x" + strings.Repeat("2", 40),
			TargetCapacity:    "100",
			CommittedCapacity: "100",
			DrawnPrincipal:    "10",
			AvailableCapacity: "90",
			ValidUntil:        time.Now().Add(time.Hour),
			State:             readmodel.RootActive,
			Children: []readmodel.ChildAccord{{
				ID:                "0x" + strings.Repeat("3", 64),
				SelectedCapacity:  "100",
				CommittedCapacity: "100",
				DrawnPrincipal:    "10",
				State:             readmodel.ChildActive,
			}},
		},
	}, "coston2", 114, common.HexToAddress("0x"+strings.Repeat("4", 40)), common.HexToAddress("0x"+strings.Repeat("5", 40)))
	if err != nil {
		t.Fatal(err)
	}
	return httptest.NewServer(server.Handler())
}

func TestGetFacilityReturnsSharedState(t *testing.T) {
	server := testServer(t)
	defer server.Close()
	response, err := http.Get(server.URL + "/v1/facilities/0x" + strings.Repeat("1", 64))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var body struct {
		Data readmodel.Facility `json:"data"`
		Meta readmodel.Meta     `json:"meta"`
	}
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Data.State != readmodel.RootActive || body.Data.AvailableCapacity != "90" {
		t.Fatalf("unexpected facility projection: %+v", body.Data)
	}
	if body.Meta.Observation.Status != readmodel.Observed {
		t.Fatalf("unexpected observation: %+v", body.Meta.Observation)
	}
}

func TestPrepareDrawRejectsObservedCapacityViolation(t *testing.T) {
	server := testServer(t)
	defer server.Close()
	body := `{"action":"draw","rootAccordId":"0x` + strings.Repeat("1", 64) + `","drawId":"0x` + strings.Repeat("6", 64) + `","amount":"91","actor":"treasury"}`
	response, err := http.Post(server.URL+"/v1/transactions/prepare", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d", response.StatusCode)
	}
}

func TestPrepareDrawReturnsUnsignedIntent(t *testing.T) {
	server := testServer(t)
	defer server.Close()
	body := `{"action":"draw","rootAccordId":"0x` + strings.Repeat("1", 64) + `","drawId":"0x` + strings.Repeat("6", 64) + `","amount":"90","actor":"agent"}`
	response, err := http.Post(server.URL+"/v1/transactions/prepare", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		data, _ := io.ReadAll(response.Body)
		t.Fatalf("status = %d body = %s", response.StatusCode, data)
	}
	var bodyResponse struct {
		Data readmodel.TransactionIntent `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&bodyResponse); err != nil {
		t.Fatal(err)
	}
	if !bodyResponse.Data.RequiresExplicitApproval || !strings.HasPrefix(bodyResponse.Data.Data, "0x") {
		t.Fatalf("unexpected intent: %+v", bodyResponse.Data)
	}
}
