export function notFound(req, res) {
  res.status(404).json({ success: false, error: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Malformed JSON bodies and CORS rejections are client errors, not 500s.
  let status = err.status || err.statusCode || 500;
  if (err.type === "entity.parse.failed") status = 400;
  if (err.message === "Origin not allowed") status = 403;

  console.error(err);

  // Don't leak upstream/internal error text (Stripe, Odds API) to browsers.
  const message =
    status >= 500 && status !== 503
      ? "Internal server error"
      : err.message || "Request failed";

  res.status(status).json({ success: false, error: message });
}
