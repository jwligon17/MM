function hasValidRoads(roads = []) {
  return roads.some((r) => (typeof r === "string" ? r.trim() : String(r || "").trim()).length > 0);
}

module.exports = {
  hasValidRoads,
};
