export function notFound(req, res) {
  res.status(404).json({ success: false, error: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ success: false, error: err.message || "Internal server error" });
}
