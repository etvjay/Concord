# Concord REST surface

`openapi.yaml` is the v1 integration contract. The runnable implementation is
the read-only chain projection and unsigned-intent server exposed by:

```bash
./scripts/concord api \
  -facility 0x... \
  -registry 0x...
```

The server reads `CapitalFacility` and `AccordRegistry` through the configured
RPC. It does not use an indexer yet, and it does not sign, broadcast, custody,
or authorize transactions. A successful `POST /v1/transactions/prepare`
response means only that calldata was constructed and current read
preconditions were checked.

The API deliberately returns amounts as base-unit decimal strings and marks
private quote fields as `withheld`. The frontend and SDK must consume these
same fields rather than reconstructing protocol state independently.
