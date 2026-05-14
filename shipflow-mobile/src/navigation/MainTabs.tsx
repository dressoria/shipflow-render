import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MainTabParamList } from "../types";
import { colors } from "../constants/theme";
import { useAuth } from "../services/auth";
import { DashboardScreen } from "../screens/DashboardScreen";
import { CreateGuideScreen } from "../screens/CreateGuideScreen";
import { ShipmentsScreen } from "../screens/ShipmentsScreen";
import { TrackingScreen } from "../screens/TrackingScreen";
import { BalanceScreen } from "../screens/BalanceScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AdminScreen } from "../screens/AdminScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: "#94A3B8",
      }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Home" }} />
      <Tab.Screen name="CreateGuide" component={CreateGuideScreen} options={{ title: "Label" }} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} options={{ title: "Shipments" }} />
      <Tab.Screen name="Tracking" component={TrackingScreen} options={{ title: "Tracking" }} />
      <Tab.Screen name="Balance" component={BalanceScreen} options={{ title: "Balance" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      {isAdmin ? <Tab.Screen name="Admin" component={AdminScreen} options={{ title: "Admin" }} /> : null}
    </Tab.Navigator>
  );
}

const tabIcons: Record<keyof MainTabParamList, string> = {
  Dashboard: "H",
  CreateGuide: "+",
  Shipments: "S",
  Tracking: "T",
  Balance: "$",
  Profile: "P",
  Admin: "A",
};

function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key]?.options;
        const label =
          typeof options?.title === "string"
            ? options.title
            : typeof options?.tabBarLabel === "string"
              ? options.tabBarLabel
              : route.name;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={[styles.tabItem, focused && styles.tabItemActive]}
          >
            <Text style={[styles.tabIcon, focused && styles.tabTextActive]}>
              {tabIcons[route.name as keyof MainTabParamList] ?? "*"}
            </Text>
            <Text numberOfLines={1} style={[styles.tabLabel, focused && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#CFFAFE",
    borderTopWidth: 1,
    elevation: 12,
    flexDirection: "row",
    gap: 4,
    minHeight: 72,
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  tabItem: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  tabItemActive: {
    backgroundColor: "#ECFEFF",
  },
  tabIcon: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 19,
  },
  tabLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
  },
  tabTextActive: {
    color: colors.cyan,
  },
});
