import { StyleSheet, View } from "react-native";

export function HeroBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <View style={styles.sky} />
      <View style={[styles.route, styles.routeOne]} />
      <View style={[styles.route, styles.routeTwo]} />
      <View style={[styles.dot, styles.dotOne]} />
      <View style={[styles.dot, styles.dotTwo]} />
      <View style={[styles.building, styles.buildingOne]} />
      <View style={[styles.building, styles.buildingTwo]} />
      <View style={[styles.building, styles.buildingThree]} />
      <View style={styles.warehouse} />
      <View style={styles.truck}>
        <View style={styles.truckCab} />
      </View>
      <View style={styles.overlay} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#0F172A",
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F172A",
  },
  route: {
    backgroundColor: "rgba(6,182,212,0.34)",
    height: 3,
    position: "absolute",
    transform: [{ rotate: "-18deg" }],
    width: 360,
  },
  routeOne: {
    right: -90,
    top: 135,
  },
  routeTwo: {
    left: -100,
    top: 260,
    transform: [{ rotate: "16deg" }],
  },
  dot: {
    backgroundColor: "#22C55E",
    borderRadius: 7,
    height: 14,
    position: "absolute",
    width: 14,
  },
  dotOne: {
    right: 82,
    top: 118,
  },
  dotTwo: {
    left: 76,
    top: 285,
  },
  building: {
    backgroundColor: "rgba(148,163,184,0.28)",
    bottom: 0,
    position: "absolute",
  },
  buildingOne: {
    height: 210,
    left: 12,
    width: 72,
  },
  buildingTwo: {
    height: 260,
    left: 92,
    width: 96,
  },
  buildingThree: {
    height: 180,
    right: 12,
    width: 112,
  },
  warehouse: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderTopColor: "rgba(255,255,255,0.36)",
    borderTopWidth: 2,
    bottom: 0,
    height: 130,
    left: 0,
    position: "absolute",
    right: 0,
  },
  truck: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    bottom: 54,
    height: 46,
    position: "absolute",
    right: 28,
    width: 128,
  },
  truckCab: {
    backgroundColor: "#06B6D4",
    borderBottomRightRadius: 14,
    borderTopRightRadius: 14,
    height: 46,
    position: "absolute",
    right: 0,
    width: 42,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
