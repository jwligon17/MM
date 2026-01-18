import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type DriverProfileCardProps = {
  username?: string;
  home?: string;
  work?: string;
  isEditing?: boolean;
  draftHome?: string;
  draftWork?: string;
  onChangeHome?: (value: string) => void;
  onChangeWork?: (value: string) => void;
  onPressEdit?: () => void;
  onPressCancel?: () => void;
};

const DriverProfileCard: React.FC<DriverProfileCardProps> = ({
  username,
  home,
  work,
  isEditing,
  draftHome,
  draftWork,
  onChangeHome,
  onChangeWork,
  onPressEdit,
  onPressCancel,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Driver Profile</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={onPressEdit} hitSlop={8}>
            <Text style={styles.actionText}>{isEditing ? "Save" : "Edit"}</Text>
          </Pressable>
          {isEditing ? (
            <Pressable onPress={onPressCancel} hitSlop={8}>
              <Text style={styles.actionTextMuted}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.divider} />
      <Text style={styles.profileLine}>
        <Text style={styles.profileKey}>Username: </Text>
        <Text style={styles.profileValue}>{username ?? "--"}</Text>
      </Text>
      <Text style={styles.privacyNote}>
        Privacy note: Your home/work zones never share exact addresses.
      </Text>
      <Text style={styles.profileLine}>
        <Text style={styles.profileKey}>Home: </Text>
        {isEditing ? (
          <TextInput
            value={draftHome}
            onChangeText={onChangeHome}
            placeholder="Enter home address"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="words"
            autoCorrect={false}
            keyboardType="default"
            returnKeyType="done"
            maxLength={60}
            style={styles.input}
          />
        ) : (
          <Text style={styles.profileValue}>{home ?? "--"}</Text>
        )}
      </Text>
      <Text style={[styles.profileLine, styles.profileLineLast]}>
        <Text style={styles.profileKey}>Work: </Text>
        {isEditing ? (
          <TextInput
            value={draftWork}
            onChangeText={onChangeWork}
            placeholder="Enter work address"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="words"
            autoCorrect={false}
            keyboardType="default"
            returnKeyType="done"
            maxLength={60}
            style={styles.input}
          />
        ) : (
          <Text style={styles.profileValue}>{work ?? "--"}</Text>
        )}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  title: {
    color: "rgba(226,232,240,0.92)",
    fontWeight: "700",
    fontSize: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  actionText: {
    color: "rgba(129,140,248,0.95)",
    fontWeight: "700",
    fontSize: 14,
  },
  actionTextMuted: {
    color: "rgba(226,232,240,0.7)",
    fontWeight: "600",
    fontSize: 14,
  },
  divider: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 10,
    marginBottom: 12,
  },
  profileLine: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    marginBottom: 6,
  },
  profileLineLast: {
    marginBottom: 0,
  },
  profileKey: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700",
  },
  profileValue: {
    color: "#fff",
    fontWeight: "900",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  input: {
    paddingVertical: 6,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
    flex: 1,
  },
  privacyNote: {
    marginBottom: 8,
    color: "rgba(245,158,11,0.85)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
});

export default DriverProfileCard;
