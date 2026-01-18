export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

const fallbackInviteUrl = "https://example.com";
const rawInviteUrl = process.env.EXPO_PUBLIC_MILEMEND_INVITE_URL;

if (__DEV__ && !rawInviteUrl) {
  // Surface missing env in development so release builds can be configured correctly.
  // eslint-disable-next-line no-console
  console.warn(
    "[Invite] EXPO_PUBLIC_MILEMEND_INVITE_URL is not set; using fallback."
  );
}

export const MILEMEND_INVITE_URL = rawInviteUrl || fallbackInviteUrl;
