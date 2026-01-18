const { searchStreets } = require("./searchStreets");

export async function fetchStreetSuggestions({
  query,
  city,
  stateCode,
  stateName,
  limit = 8,
  countryCode = "us",
  signal,
  requestId = null,
}) {
  return searchStreets({
    query,
    city,
    stateCode,
    stateName,
    limit,
    countryCode,
    signal,
    requestId,
  });
}

module.exports = {
  fetchStreetSuggestions,
  searchStreets,
};
