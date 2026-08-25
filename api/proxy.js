const COINGECKO_BASE = "[api.coingecko.com](https://api.coingecko.com/api/v3)";
const FEAR_GREED_URL = "[api.alternative.me](https://api.alternative.me/fng/?limit=1)";

const ALLOWED_ROUTES = [
  /^\/coins\/markets$/,
  /^\/global$/,
  /^\/search$/,
  /^\/simple\/price$/,
  /^\/coins\/[a-zA-Z0-9_-]+\/market_chart$/
];

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isAllowedPath(path) {
  return ALLOWED_ROUTES.some(pattern => pattern.test(path));
}

function copyQueryParameters(query, excludedKeys = []) {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    if (excludedKeys.includes(key) || rawValue == null) continue;

    const values = Array.isArray(rawValue)
      ? rawValue
      : [rawValue];

    for (const value of values) {
      params.append(key, String(value));
    }
  }

  return params;
}

async function fetchWithTimeout(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "CryptoTracker/1.0"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");

    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const service = String(req.query.service || "coingecko");

  try {
    let upstreamUrl;

    if (service === "fear-greed") {
      upstreamUrl = FEAR_GREED_URL;
    } else {
      const rawPath = Array.isArray(req.query.path)
        ? req.query.path[0]
        : req.query.path;

      const path = String(rawPath || "");

      if (!path.startsWith("/") || !isAllowedPath(path)) {
        return res.status(400).json({
          error: "Invalid or prohibited path"
        });
      }

      const params = copyQueryParameters(
        req.query,
        ["service", "path"]
      );

      upstreamUrl =
        COINGECKO_BASE +
        path +
        (params.toString() ? `?${params.toString()}` : "");
    }

    const upstream = await fetchWithTimeout(upstreamUrl);
    const body = await upstream.text();
    const contentType =
      upstream.headers.get("content-type") ||
      "application/json; charset=utf-8";

    res.setHeader("Content-Type", contentType);

    if (service === "fear-greed") {
      res.setHeader(
        "Cache-Control",
        "s-maxage=300, stale-while-revalidate=900"
      );
    } else {
      res.setHeader(
        "Cache-Control",
        "s-maxage=60, stale-while-revalidate=300"
      );
    }

    return res.status(upstream.status).send(body);
  } catch (error) {
    console.error("Proxy error:", error);

    const timedOut = error && error.name === "AbortError";

    return res.status(502).json({
      error: timedOut
        ? "Upstream request timed out"
        : "Upstream request failed"
    });
  }
};
