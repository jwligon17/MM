function computeStreetHelperMessage({
  enabled,
  focused,
  loading,
  hasCompleted,
  suggestionsLength,
  queryLength,
  minChars = 3,
}) {
  if (!enabled) return null;

  const qLen = queryLength || 0;
  if (focused && qLen > 0 && qLen < minChars) {
    return `Type ${minChars}+ letters...`;
  }

  if (focused && qLen >= minChars && !loading && hasCompleted && suggestionsLength === 0) {
    return "No matches yet -- keep typing or enter the full street name";
  }

  if (focused && loading) {
    return "Searching...";
  }

  return null;
}

module.exports = {
  computeStreetHelperMessage,
};
