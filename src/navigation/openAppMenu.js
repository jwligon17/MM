import { DrawerActions } from "@react-navigation/native";

export function openAppMenu(navigation) {
  if (!navigation) return;

  const parent = navigation.getParent?.();
  if (parent?.dispatch) {
    parent.dispatch(DrawerActions.openDrawer());
  } else {
    navigation.dispatch?.(DrawerActions.openDrawer());
  }
}
