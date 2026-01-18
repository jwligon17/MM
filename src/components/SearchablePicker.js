import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from "react-native";

export default function SearchablePicker({
  label,
  placeholder = "Select",
  value,
  options = [],
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel =
    options.find((o) => o.value === value)?.label || value || "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? options.filter((o) => (o.label || "").toLowerCase().includes(q))
      : options;
    return base.slice(0, 80);
  }, [options, query]);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[styles.field, disabled && styles.fieldDisabled]}
      >
        <Text style={[styles.fieldText, !selectedLabel && styles.placeholder]}>
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Type to search..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.search}
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => `${item.value}-${item.label}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange?.(item.value, item);
                  setOpen(false);
                  setQuery("");
                }}
                style={styles.row}
              >
                <Text style={styles.rowText}>{item.label}</Text>
              </Pressable>
            )}
          />
          <Pressable onPress={() => setOpen(false)} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  fieldDisabled: { opacity: 0.45 },
  fieldText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  placeholder: { color: "rgba(255,255,255,0.35)" },
  chevron: { color: "#37df21", fontSize: 18, fontWeight: "900" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 90,
    bottom: 90,
    borderRadius: 18,
    backgroundColor: "rgba(12,12,12,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
  },
  sheetTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  search: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    marginBottom: 10,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  rowText: { color: "#fff", fontSize: 16 },
  cancel: { padding: 14, alignItems: "center" },
  cancelText: { color: "rgba(255,255,255,0.7)", fontWeight: "800" },
});
