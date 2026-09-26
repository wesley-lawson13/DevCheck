// Flattens an axios error (typically a DRF error response) into one
// human-readable string, so callers can show it inline instead of alert().
export function getErrorMessage(
  err,
  fallback = "Something went wrong. Please try again.",
) {
  const data = err?.response?.data;

  if (!data) {
    return err?.message || fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return String(data.detail);
  }

  const messages = Object.entries(data).flatMap(([field, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map((v) =>
      field === "non_field_errors" ? String(v) : `${field}: ${v}`,
    );
  });

  return messages.length > 0 ? messages.join(" ") : fallback;
}
