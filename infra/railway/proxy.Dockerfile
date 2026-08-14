ARG TEE_PROXY_VERSION=v0.0.18

FROM golang:1.25.1-alpine AS build
ARG TEE_PROXY_VERSION
RUN apk add --no-cache git
WORKDIR /src
RUN git clone --depth 1 --branch "${TEE_PROXY_VERSION}" https://github.com/flare-foundation/tee-proxy.git
WORKDIR /src/tee-proxy
COPY infra/railway/tee-proxy-redis-auth.patch /tmp/tee-proxy-redis-auth.patch
RUN git apply --check /tmp/tee-proxy-redis-auth.patch && git apply /tmp/tee-proxy-redis-auth.patch
RUN go mod download && go mod verify
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOFLAGS="-buildvcs=false" \
    go build -trimpath -ldflags="-buildid= -s -w" -o /out/tee-proxy ./cmd/proxy

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build --chmod=755 /out/tee-proxy /app/tee-proxy
COPY --chmod=755 infra/railway/start-proxy.sh /app/start-proxy.sh
RUN addgroup -g 1001 -S concord && adduser -u 1001 -S concord -G concord && chown -R concord:concord /app
USER concord
ENV PORT=6664
EXPOSE 6663 6664
ENTRYPOINT ["/app/start-proxy.sh"]
