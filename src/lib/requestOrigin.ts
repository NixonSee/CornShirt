function firstHeaderValue(value: string | null): string {
  return value?.split(",", 1)[0]?.trim() ?? "";
}

function parseHttpOrigin(value: string): URL | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function isDevelopmentTunnel(url: URL): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    url.protocol === "https:" &&
    url.hostname.endsWith(".trycloudflare.com")
  );
}

export function getPublicRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const browserOrigin = parseHttpOrigin(
    firstHeaderValue(request.headers.get("origin")),
  );
  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host"),
  ).toLowerCase();
  const requestHost = firstHeaderValue(
    request.headers.get("host"),
  ).toLowerCase();
  const knownHosts = new Set(
    [forwardedHost, requestHost, requestUrl.host.toLowerCase()].filter(Boolean),
  );

  // Browser checkout requests carry their public origin. Accept it when the
  // proxy preserved the matching host, or for HTTPS Quick Tunnels in local
  // development where Next.js may reconstruct request.url as localhost.
  if (
    browserOrigin &&
    (knownHosts.has(browserOrigin.host.toLowerCase()) ||
      isDevelopmentTunnel(browserOrigin))
  ) {
    return browserOrigin.origin;
  }

  const proxyHost = forwardedHost || requestHost;
  let proxyOrigin: URL | null = null;
  if (proxyHost) {
    const forwardedProtocol = firstHeaderValue(
      request.headers.get("x-forwarded-proto"),
    ).toLowerCase();
    const protocol =
      forwardedProtocol === "https" || forwardedProtocol === "http"
        ? forwardedProtocol
        : requestUrl.protocol.slice(0, -1);
    proxyOrigin = parseHttpOrigin(`${protocol}://${proxyHost}`);

    if (proxyOrigin && isDevelopmentTunnel(proxyOrigin)) {
      return proxyOrigin.origin;
    }
  }

  const configuredOrigin = parseHttpOrigin(
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "",
  );
  if (configuredOrigin) {
    return configuredOrigin.origin;
  }

  if (proxyOrigin) return proxyOrigin.origin;

  return requestUrl.origin;
}
