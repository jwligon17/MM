import { State } from "country-state-city";

const US_STATES = State.getStatesOfCountry("US") || [];

export const STATE_NAME_TO_CODE = Object.freeze(
  US_STATES.reduce((acc, state) => {
    acc[String(state.name || "").toLowerCase()] = state.isoCode;
    return acc;
  }, {})
);

const STATE_CODE_TO_NAME = Object.freeze(
  US_STATES.reduce((acc, state) => {
    acc[String(state.isoCode || "").toUpperCase()] = state.name;
    return acc;
  }, {})
);

function asText(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  return String(x?.label || x?.value || "");
}

export function normalizeState({ stateName, stateCode } = {}) {
  const codeRaw = asText(stateCode).trim().toUpperCase();
  const nameRaw = asText(stateName).trim();
  const normalizedCode =
    codeRaw || (nameRaw ? STATE_NAME_TO_CODE[nameRaw.toLowerCase()] || "" : "");
  const normalizedName =
    nameRaw || (normalizedCode ? STATE_CODE_TO_NAME[normalizedCode] || "" : "");

  return {
    stateCode: normalizedCode || null,
    stateName: normalizedName || null,
  };
}
