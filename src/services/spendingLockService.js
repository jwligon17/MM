import * as LocalAuthentication from "expo-local-authentication";

export const spendingLockCapabilityMessage = "Set up Face ID/Touch ID or device passcode to enable App Lock.";

export async function getSpendingLockCapability() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supported = hasHardware && isEnrolled;

  return { hasHardware, isEnrolled, supported };
}

export async function requestSpendingUnlock({ reason } = {}) {
  try {
    const capability = await getSpendingLockCapability();

    if (!capability.supported) {
      return {
        ok: false,
        reason: "unsupported",
        error: spendingLockCapabilityMessage,
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason || "Confirm to spend points",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { ok: true };
    }

    const failureReason =
      result.error === "user_cancel" || result.error === "system_cancel" ? "cancelled" : "failed";

    return {
      ok: false,
      reason: failureReason,
      error: result.error || "Authentication failed.",
    };
  } catch (error) {
    return { ok: false, reason: "failed", error: error?.message || "Authentication failed." };
  }
}

export default {
  getSpendingLockCapability,
  requestSpendingUnlock,
  spendingLockCapabilityMessage,
};
