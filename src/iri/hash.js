import * as Crypto from "expo-crypto";

// Generate a base64url-encoded SHA-256 digest for stable anonymous IDs.
export const sha256Base64Url = async (input) => {
  const value = input === undefined || input === null ? "" : String(input);

  try {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      value,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (error) {
    console.warn("Failed to compute SHA-256 hash", error);
    return null;
  }
};

export default sha256Base64Url;
