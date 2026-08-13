const ALLOWED_METHODS = {
  "/info": new Set(["GET", "HEAD"]),
  "/health": new Set(["GET", "HEAD"]),
  "/instruction": new Set(["POST"]),
  "/metrics": new Set(["GET", "HEAD"]),
};

function isAllowedPath(pathname) {
  return (
    pathname in ALLOWED_METHODS ||
    pathname === "/action/status" ||
    pathname.startsWith("/action/status/") ||
    pathname === "/action/result" ||
    pathname.startsWith("/action/result/")
  );
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);

    if (!isAllowedPath(incoming.pathname)) {
      return json(404, { error: "not_found" });
    }

    const allowedMethods =
      ALLOWED_METHODS[incoming.pathname] ?? new Set(["GET", "HEAD"]);
    if (!allowedMethods.has(request.method)) {
      return json(405, { error: "method_not_allowed" });
    }

    if (!env.CONCORD_UPSTREAM_URL) {
      return json(503, { error: "upstream_not_configured" });
    }

    let upstream;
    try {
      upstream = new URL(env.CONCORD_UPSTREAM_URL);
    } catch {
      return json(503, { error: "upstream_invalid" });
    }

    if (upstream.protocol !== "https:") {
      return json(503, { error: "upstream_must_use_https" });
    }

    upstream.pathname = incoming.pathname;
    upstream.search = incoming.search;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");
    headers.delete("cookie");
    headers.set("cache-control", "no-store");
    headers.set("x-concord-ingress", "cloudflare-workers-development-relay");

    try {
      const response = await fetch(upstream, {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : request.body,
        redirect: "manual",
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.delete("set-cookie");
      responseHeaders.set("cache-control", "no-store");
      responseHeaders.set(
        "x-concord-ingress",
        "cloudflare-workers-development-relay",
      );

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch {
      return json(502, { error: "upstream_unreachable" });
    }
  },
};
