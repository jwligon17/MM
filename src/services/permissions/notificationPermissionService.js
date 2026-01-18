import * as Notifications from "expo-notifications";

export async function getNotificationPermissionStatus() {
  try {
    const perms = await Notifications.getPermissionsAsync();
    return perms?.status ?? "undetermined";
  } catch (e) {
    console.warn("[NotificationsPerm] getPermissionsAsync failed", e);
    return "error";
  }
}

export async function requestNotificationPermission() {
  try {
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return result?.status ?? "undetermined";
  } catch (e) {
    console.warn("[NotificationsPerm] requestPermissionsAsync failed", e);
    return "error";
  }
}
