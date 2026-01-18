import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DriveScreen from "../screens/ImpactScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ProfileBadgesScreen from "../screens/ProfileBadgesScreen";
import ProfileLeaderboardsScreen from "../screens/ProfileLeaderboardsScreen";
import TripHistoryScreen from "../screens/TripHistoryScreen";
import DevToolsScreen from "../screens/DevToolsScreen";
import ImpactEventsScreen from "../screens/ImpactEventsScreen";
import PotholeParentScreen from "../screens/PotholeParentScreen";
import PotholeDebugScreen from "../screens/PotholeDebugScreen";
import RewardsScreen from "../screens/RewardsScreen";
import { useAppState } from "../state/AppStateContext";
import { styles } from "../styles";

const Tab = createBottomTabNavigator();
const ImpactStack = createNativeStackNavigator();
const TripsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const RewardsStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

const tabs = [
  { key: "Drive", icon: "Drive", label: "drive" },
  { key: "Impact", icon: "Impact", label: "parent" },
  { key: "Trips", icon: "Trips", label: "trips" },
  { key: "Profile", icon: "Profile", label: "profile" },
];

const ACTIVE_TINT = "#39ff14";
const INACTIVE_TINT = "#ffffff";

const TabGlyph = ({ name, active, avatarUri }) => {
  const size = 34;
  const color = active ? ACTIVE_TINT : INACTIVE_TINT;

  if (name === "Profile" && avatarUri) {
    return (
      <View
        style={[
          styles.iconWrapper,
          styles.profileTabAvatarWrapper,
          active && styles.profileTabAvatarWrapperActive,
        ]}
      >
        <LinearGradient
          colors={
            active
              ? ["rgba(57,255,20,0.6)", "rgba(34,211,238,0.4)"]
              : ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileTabAvatarGlow}
        />
        <Image
          source={{ uri: avatarUri }}
          style={styles.profileTabAvatarImage}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconWrapper,
        {
          width: 44,
          height: 44,
        },
      ]}
    >
      {name === "Drive" && (
        <MaterialCommunityIcons name="steering" size={size} color={color} />
      )}
      {name === "Impact" && (
        <MaterialCommunityIcons
          name={active ? "heart" : "heart-outline"}
          size={size}
          color={color}
        />
      )}
      {name === "Trips" && (
        <MaterialCommunityIcons
          name={active ? "map" : "map-outline"}
          size={size}
          color={color}
        />
      )}
      {name === "Profile" && (
        <MaterialCommunityIcons
          name="account-circle-outline"
          size={size}
          color={color}
        />
      )}
    </View>
  );
};

const TabButton = ({ label, icon, active, onPress, onLongPress }) => {
  const { getEquippedAvatarImage } = useAppState();
  const avatarUri = icon === "Profile" ? getEquippedAvatarImage?.() : null;

  return (
    <Pressable
      style={[styles.tabButton, active && styles.tabButtonActive]}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.tabLabelRow}>
        <TabGlyph name={icon} active={active} avatarUri={avatarUri} />
      </View>
    </Pressable>
  );
};

const CustomTabBar = ({
  state,
  navigation,
  paddingTop = 0,
  paddingBottom = 0,
}) => {
  const ICON_ROW_HEIGHT = 44;
  const BAR_HEIGHT = ICON_ROW_HEIGHT + paddingTop + paddingBottom;
  const FADE_HEIGHT = 220;
  const GRADIENT_HEIGHT = BAR_HEIGHT + FADE_HEIGHT;

  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom,
          paddingTop,
          height: BAR_HEIGHT,
          justifyContent: "flex-end",
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -2,
          height: GRADIENT_HEIGHT + 2,
          zIndex: 0,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(0,0,0,0)",
            "rgba(0,0,0,0.28)",
            "rgba(0,0,0,0.62)",
            "rgba(0,0,0,0.92)",
          ]}
          locations={[0, 0.45, 0.78, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={[styles.tabRow, { zIndex: 1 }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tabConfig = tabs.find((tab) => tab.key === route.name);

          if (!tabConfig) {
            return null;
          }

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TabButton
              key={route.key}
              label={tabConfig.label}
              icon={tabConfig.icon}
              active={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
};

const ImpactStackScreen = () => (
  <ImpactStack.Navigator
    initialRouteName="DriveHome"
    screenOptions={{ headerShown: false }}
  >
    <ImpactStack.Screen name="DriveHome" component={DriveScreen} />
    <ImpactStack.Screen name="TripHistory" component={TripHistoryScreen} />
    <ImpactStack.Screen name="ImpactEvents" component={ImpactEventsScreen} />
    <ImpactStack.Screen name="PotholeDebug" component={PotholeDebugScreen} />
    <ImpactStack.Screen name="DevTools" component={DevToolsScreen} />
  </ImpactStack.Navigator>
);

const TripsStackScreen = () => (
  <TripsStack.Navigator
    initialRouteName="TripHistory"
    screenOptions={{ headerShown: false }}
  >
    <TripsStack.Screen name="TripHistory" component={TripHistoryScreen} />
  </TripsStack.Navigator>
);

const ProfileStackScreen = () => (
  <ProfileStack.Navigator
    initialRouteName="ProfileHome"
    screenOptions={{ headerShown: false }}
  >
    <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
    <ProfileStack.Screen name="ProfileBadges" component={ProfileBadgesScreen} />
    <ProfileStack.Screen
      name="ProfileLeaderboards"
      component={ProfileLeaderboardsScreen}
    />
  </ProfileStack.Navigator>
);

const RewardsStackScreen = () => (
  <RewardsStack.Navigator
    initialRouteName="RewardsHome"
    screenOptions={{ headerShown: false }}
  >
    <RewardsStack.Screen name="RewardsHome" component={RewardsScreen} />
  </RewardsStack.Navigator>
);

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const tabBarPaddingTop = 0;
  const tabBarPaddingBottom = insets.bottom + 8;
  const ICON_ROW_HEIGHT = 44;
  const tabBarHeight = ICON_ROW_HEIGHT + tabBarPaddingTop + tabBarPaddingBottom;

  return (
    <Tab.Navigator
      initialRouteName="Drive"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          position: "absolute",
          overflow: "visible",
          height: tabBarHeight,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
        },
      }}
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          paddingTop={tabBarPaddingTop}
          paddingBottom={tabBarPaddingBottom}
        />
      )}
    >
      <Tab.Screen name="Drive" component={ImpactStackScreen} />
      <Tab.Screen
        name="Impact"
        component={PotholeParentScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Trips" component={TripsStackScreen} />
      <Tab.Screen name="Profile" component={ProfileStackScreen} />
    </Tab.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <RootStack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="Rewards" component={RewardsStackScreen} />
      <RootStack.Screen name="DevTools" component={DevToolsScreen} />
    </RootStack.Navigator>
  );
};

export default TabNavigator;
