import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getModelsForMake } from "../../services/vehicleCatalog";
import { fetchVehicleTrimOptions } from "../../services/vehicles/vehicleTrimService";

const makeOptions = [
  "Ford",
  "Chevrolet",
  "Toyota",
  "Honda",
  "Nissan",
  "Tesla",
  "BMW",
  "Mercedes-Benz",
  "Volkswagen",
  "Hyundai",
  "Kia",
  "Jeep",
];

const SelectModal = ({
  visible,
  options,
  onClose,
  title,
  activeField,
  onChange,
  modelQuery,
  onModelQueryChange,
  modelsLoading,
  modelsError,
  onManualEntryPress,
  hasModelResults,
  trimLoading,
  trimQuery,
  onTrimQueryChange,
}) => {
  const handleOptionPress = (option) => {
    if (activeField === "make") {
      onChange?.({ make: option, model: null, trim: null });
    }
    if (activeField === "model") {
      onChange?.({ model: option });
    }
    if (activeField === "year") {
      onChange?.({ year: option });
    }
    if (activeField === "trim") {
      if (__DEV__) console.log("[VehicleCalibration] selected trim:", option);
      onChange?.({ trim: option === "__OTHER__" ? "" : option });
    }
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {title ? <Text style={styles.modalTitle}>{title}</Text> : null}
          {activeField === "model" ? (
            <View style={styles.searchContainer}>
              <TextInput
                value={modelQuery}
                onChangeText={onModelQueryChange}
                placeholder="Search model..."
                placeholderTextColor="#9AA0A6"
                style={styles.searchInput}
                autoFocus
              />
            </View>
          ) : null}
          {activeField === "trim" ? (
            <View style={styles.searchContainer}>
              <TextInput
                value={trimQuery}
                onChangeText={onTrimQueryChange}
                placeholder="Search trim..."
                placeholderTextColor="#9AA0A6"
                style={styles.searchInput}
                autoFocus
              />
            </View>
          ) : null}
          {activeField === "model" && modelsLoading ? (
            <View style={styles.optionRow}>
              <Text style={styles.optionText}>Loading models...</Text>
            </View>
          ) : null}
          {activeField === "trim" && trimLoading ? (
            <View style={styles.optionRow}>
              <Text style={styles.optionText}>Loading trims...</Text>
            </View>
          ) : null}
          {activeField === "model" && modelsError ? (
            <View style={styles.optionRow}>
              <Text style={styles.optionErrorText}>{modelsError}</Text>
            </View>
          ) : null}
          {activeField === "model" && !modelsLoading && !hasModelResults ? (
            <View style={styles.optionRow}>
              <Text style={styles.optionText}>
                No models found. Enter manually.
              </Text>
            </View>
          ) : null}
          <FlatList
            data={options}
            keyExtractor={(item, index) =>
              typeof item === "string"
                ? item
                : item?.key ||
                  item?.value ||
                  item?.label ||
                  `${item?.type || "item"}-${index}`
            }
            renderItem={({ item }) => {
              if (typeof item === "string") {
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.optionRow,
                      pressed && styles.optionRowPressed,
                    ]}
                    onPress={() => handleOptionPress(item)}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                  </Pressable>
                );
              }

              if (item?.type === "header") {
                return (
                  <View style={styles.optionHeaderRow}>
                    <Text style={styles.optionHeaderText}>{item.label}</Text>
                  </View>
                );
              }

      if (item?.type === "item") {
        const itemLabel = item?.label ?? item?.value;
        return (
          <Pressable
            style={({ pressed }) => [
                      styles.optionRow,
                      pressed && styles.optionRowPressed,
                    ]}
                    onPress={() => handleOptionPress(item.value)}
                  >
                    <Text style={styles.optionText}>{itemLabel}</Text>
                  </Pressable>
                );
              }

              return null;
            }}
            ItemSeparatorComponent={() => <View style={styles.optionDivider} />}
          />
          {activeField === "model" ? (
            <Pressable
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.optionRowPressed,
              ]}
              onPress={() => {
                onClose?.();
                onManualEntryPress?.();
              }}
            >
              <Text style={styles.optionText}>
                Can't find your model? Tap to enter manually
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.modalCloseButton,
              pressed && styles.modalCloseButtonPressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const VehicleCalibrationPage = ({
  backgroundImageSource,
  backgroundDim = 0.45,
  title,
  fields = {},
  questions = {},
  bottomInset = 0,
  value = {},
  onChange,
  onValidityChange,
}) => {
  const safeValue = value ?? {};

  useEffect(() => {
    if (__DEV__) {
      // Development hook retained for future error logging; intentionally silent.
    }
  }, [safeValue]);

  const selectedMake = safeValue.make ?? null;
  const selectedModel = safeValue.model ?? null;
  const selectedYear = safeValue.year ?? null;
  const { tiresReplaced, shocksReplaced } = safeValue;
  const [selectField, setSelectField] = useState(null);
  const [modalOptions, setModalOptions] = useState([]);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState(null);
  const [modelQuery, setModelQuery] = useState("");
  const [manualModelOpen, setManualModelOpen] = useState(false);
  const [manualModelText, setManualModelText] = useState("");
  const [trimOptions, setTrimOptions] = useState([]);
  const [trimLoading, setTrimLoading] = useState(false);
  const [trimQuery, setTrimQuery] = useState("");
  const trimKeyRef = useRef("");
  const didInitTrimKeyRef = useRef(false);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 31 }, (_, i) =>
      (currentYear - i).toString()
    );
  }, []);
  const trimEnabled =
    Boolean(selectedMake) && Boolean(selectedModel) && Boolean(selectedYear);
  const showManualTrim = value?.trim === "" && trimEnabled;

  useEffect(() => {
    if (onValidityChange) {
      const valid = Boolean(selectedMake && selectedModel && selectedYear);
      onValidityChange(valid);
    }
  }, [selectedMake, selectedModel, selectedYear, onValidityChange]);

  useEffect(() => {
    if (selectField === "trim") {
      setTrimQuery("");
    }
  }, [selectField]);

  useEffect(() => {
    let isMounted = true;
    setModelQuery("");
    setModelsError(null);
    if (!selectedMake) {
      setModels([]);
      setModelsLoading(false);
      return () => {
        isMounted = false;
      };
    }
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const list = await getModelsForMake(selectedMake, selectedYear);
        if (!isMounted) {
          return;
        }
        setModels(list);
      } catch (error) {
        if (isMounted) {
          setModelsError("Couldn't load models. You can enter it manually.");
          setModels([]);
        }
      } finally {
        if (isMounted) {
          setModelsLoading(false);
        }
      }
    };
    loadModels();
    return () => {
      isMounted = false;
    };
  }, [selectedMake, selectedYear]);

  useEffect(() => {
    const make = value?.make;
    const model = value?.model;
    const year = value?.year;

    const key = `${make || ""}|${model || ""}|${year || ""}`;

    if (!didInitTrimKeyRef.current) {
      didInitTrimKeyRef.current = true;
      trimKeyRef.current = key;
    } else if (trimKeyRef.current !== key) {
      trimKeyRef.current = key;
      onChange?.({ trim: null });
    }

    if (!make || !model || !year) {
      setTrimOptions([
        { type: "item", label: "Not listed / Other", value: "__OTHER__" },
      ]);
      setTrimLoading(false);
      return;
    }

    let cancelled = false;
    setTrimLoading(true);

    fetchVehicleTrimOptions({ make, model, year })
      .then((opts) => {
        if (cancelled) return;

        const normalized = (Array.isArray(opts) ? opts : [])
          .map((opt) => {
            if (typeof opt === "string") {
              return { type: "item", label: opt, value: opt };
            }
            const label = opt?.label ?? opt?.value ?? "";
            const value = opt?.value ?? opt?.label ?? "";
            if (!label || !value) return null;
            return { type: "item", label, value };
          })
          .filter(Boolean);

        setTrimOptions([
          ...normalized,
          { type: "item", label: "Not listed / Other", value: "__OTHER__" },
        ]);
        setTrimQuery("");
      })
      .finally(() => {
        if (!cancelled) setTrimLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [value?.make, value?.model, value?.year]);

  const filteredModels = useMemo(() => {
    const query = modelQuery.toLowerCase();
    return models.filter((model) => model.toLowerCase().includes(query));
  }, [models, modelQuery]);

  const filteredTrimOptions = useMemo(() => {
    if (!trimQuery) return trimOptions;

    const q = trimQuery.toLowerCase();
    const otherOption = trimOptions.find((opt) => opt?.value === "__OTHER__");
    const base = trimOptions.filter((opt) => {
      if (opt?.value === "__OTHER__") return false;
      const label = (opt?.label ?? opt?.value ?? "").toLowerCase();
      return label.includes(q);
    });

    return otherOption ? [...base, otherOption] : base;
  }, [trimOptions, trimQuery]);

  const modelListData = useMemo(() => {
    if (filteredModels.length === 0) {
      return [];
    }

    if (models.length > 25) {
      const popular = [
        "Civic",
        "Accord",
        "CR-V",
        "Camry",
        "Corolla",
        "RAV4",
        "F-150",
        "Silverado",
        "Model 3",
        "Model Y",
      ];
      const filteredSet = new Set(filteredModels);
      const popularMatches = popular.filter((name) => filteredSet.has(name));
      const data = [];
      if (popularMatches.length) {
        data.push({ type: "header", label: "Popular", key: "popular-header" });
        data.push(
          ...popularMatches.map((name) => ({
            type: "item",
            value: name,
            key: `popular-${name}`,
          }))
        );
      }
      data.push({ type: "header", label: "All Models", key: "all-header" });
      data.push(
        ...filteredModels.map((name) => ({
          type: "item",
          value: name,
          key: `model-${name}`,
        }))
      );
      return data;
    }

    return filteredModels.map((name) => ({
      type: "item",
      value: name,
      key: `model-${name}`,
    }));
  }, [filteredModels, models.length]);

  const handleOpenSelect = (field) => {
    if (field === "model" && !selectedMake) {
      return;
    }

    if (field === "make") {
      setModalOptions(makeOptions);
    } else if (field === "model") {
      setModalOptions(modelListData);
    } else if (field === "year") {
      setModalOptions(yearOptions);
    } else if (field === "trim") {
      setModalOptions(filteredTrimOptions);
    }
    setSelectField(field);
  };

  const toggleCheckbox = (field) => {
    onChange?.({ [field]: !safeValue[field] });
  };

  const renderDropdown = (field, label, placeholder) => {
    const isModelEnabled = Boolean(value?.make);
    const isDisabled = field === "model" && !isModelEnabled;
    const isTrimDisabled = field === "trim" && !trimEnabled;
    const currentValue =
      field === "make"
        ? selectedMake
        : field === "model"
        ? selectedModel
        : field === "year"
        ? selectedYear
        : value?.trim;
    const showPlaceholder =
      currentValue === null ||
      currentValue === undefined ||
      (typeof currentValue === "string" && currentValue.trim() === "");
    const displayText =
      field === "trim" && trimLoading
        ? "Loading trims..."
        : showPlaceholder
        ? placeholder
        : currentValue;
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.dropdown,
            (isDisabled || isTrimDisabled) && styles.dropdownDisabled,
            pressed && !isDisabled && !isTrimDisabled && styles.dropdownPressed,
          ]}
          onPress={() => {
            if (field === "model" && !isModelEnabled) {
              Alert.alert(
                "Select a Make first",
                "Choose your vehicle make before selecting a model."
              );
              return;
            }
            if (field === "trim" && !trimEnabled) {
              Alert.alert(
                "Select Make, Model, and Year first",
                "Choose make, model, and year before selecting a trim."
              );
              return;
            }
            handleOpenSelect(field);
          }}
        >
          <View style={styles.dropdownContent}>
            <Text
              style={[
                styles.selectText,
                showPlaceholder && styles.placeholderText,
              ]}
              numberOfLines={1}
            >
              {displayText}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#1C1C1E" />
          </View>
        </Pressable>
      </View>
    );
  };

  const renderCheckbox = (field, label, checked) => {
    return (
      <View style={styles.row}>
        <Text style={[styles.label, styles.multiLineLabel]}>{label}</Text>
        <View style={styles.checkboxGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.checkbox,
              checked && styles.checkboxChecked,
              pressed && styles.checkboxPressed,
            ]}
            onPress={() => toggleCheckbox(field)}
          >
            {checked ? (
              <Ionicons name="checkmark" size={24} color="#0F0" />
            ) : null}
          </Pressable>
          <Text style={styles.checkboxNote}>check box if yes</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ImageBackground
        source={backgroundImageSource}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0," + backgroundDim + ")" },
          ]}
        />
        <View style={[styles.content, { paddingBottom: bottomInset + 32 }]}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.form}>
            {renderDropdown(
              "make",
              fields.makeLabel || "Vehicle Make",
              fields.makePlaceholder || "Make"
            )}
            {renderDropdown(
              "model",
              fields.modelLabel || "Vehicle Model",
              selectedMake
                ? fields.modelPlaceholder || "Model"
                : "Select Make First"
            )}
            {renderDropdown(
              "year",
              fields.yearLabel || "Vehicle Year",
              fields.yearPlaceholder || "Year"
            )}
            {renderDropdown(
              "trim",
              fields.trimLabel || "Vehicle Trim (optional)",
              fields.trimPlaceholder || "EX-L, XLE, Sport, Limited, 4x4..."
            )}
            {showManualTrim ? (
              <View style={styles.row}>
                <Text style={styles.label} />
                <TextInput
                  style={[styles.dropdown, styles.trimInput]}
                  placeholder={
                    fields.trimPlaceholder ||
                    "EX-L, XLE, Sport, Limited, 4x4..."
                  }
                  placeholderTextColor="#9AA0A6"
                  value={value?.trim ?? ""}
                  onChangeText={(t) => onChange?.({ trim: t })}
                />
              </View>
            ) : null}
            {renderCheckbox(
              "tiresReplaced",
              questions.tires || "Have you replaced your tires in the last year?",
              Boolean(tiresReplaced)
            )}
            {renderCheckbox(
              "shocksReplaced",
              questions.shocks ||
                "Have you replaced your shocks in the last year?",
              Boolean(shocksReplaced)
            )}
          </View>
        </View>
        <SelectModal
          visible={Boolean(selectField)}
          options={
            selectField === "model"
              ? modelListData
              : selectField === "trim"
              ? filteredTrimOptions
              : modalOptions
          }
          activeField={selectField}
          onChange={onChange}
          onClose={() => setSelectField(null)}
          modelQuery={modelQuery}
          onModelQueryChange={setModelQuery}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          onManualEntryPress={() => setManualModelOpen(true)}
          hasModelResults={filteredModels.length > 0}
          trimLoading={trimLoading}
          trimQuery={trimQuery}
          onTrimQueryChange={setTrimQuery}
          title={
            selectField === "make"
              ? fields.makeLabel
              : selectField === "model"
              ? fields.modelLabel
              : selectField === "year"
              ? fields.yearLabel
              : selectField === "trim"
              ? fields.trimLabel || "Vehicle Trim (optional)"
              : undefined
          }
        />
        <Modal
          visible={manualModelOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setManualModelOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.manualModalCard}>
              <Text style={styles.modalTitle}>Enter your model</Text>
              <TextInput
                value={manualModelText}
                onChangeText={setManualModelText}
                placeholder="Type your model"
                placeholderTextColor="#9AA0A6"
                style={styles.searchInput}
                autoFocus
              />
              <View style={styles.manualModalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.manualButton,
                    pressed && styles.manualButtonPressed,
                  ]}
                  onPress={() => {
                    setManualModelOpen(false);
                    setManualModelText("");
                  }}
                >
                  <Text style={styles.manualButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.manualButton,
                    styles.manualPrimaryButton,
                    pressed && styles.manualButtonPressed,
                  ]}
                  onPress={() => {
                    onChange?.({
                      model: manualModelText.trim() || null,
                    });
                    setManualModelOpen(false);
                    setManualModelText("");
                  }}
                >
                  <Text style={styles.manualPrimaryButtonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 103,
  },
  title: {
    color: "#fff",
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    marginBottom: 36,
  },
  form: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    width: 140,
    lineHeight: 20,
  },
  multiLineLabel: {
    width: 180,
    lineHeight: 22,
  },
  dropdown: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 6,
    height: 38,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  dropdownPressed: {
    opacity: 0.85,
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    color: "#1C1C1E",
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  selectText: {
    color: "#111111",
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: "#9AA0A6",
  },
  checkbox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  checkboxNote: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
    marginLeft: 12,
  },
  checkboxChecked: {
    backgroundColor: "rgba(0,255,0,0.12)",
    borderColor: "#0F0",
  },
  checkboxPressed: {
    opacity: 0.85,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    color: "#1C1C1E",
  },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionRowPressed: {
    backgroundColor: "#F2F2F7",
  },
  optionHeaderRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FB",
  },
  optionText: {
    fontSize: 16,
    color: "#1C1C1E",
  },
  optionHeaderText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  optionDivider: {
    height: 1,
    backgroundColor: "#E5E5EA",
  },
  modalCloseButton: {
    paddingVertical: 12,
    marginTop: 4,
  },
  modalCloseButtonPressed: {
    opacity: 0.7,
  },
  modalCloseText: {
    textAlign: "center",
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    paddingHorizontal: 12,
    color: "#1C1C1E",
  },
  optionErrorText: {
    fontSize: 15,
    color: "#D14343",
  },
  manualModalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
  },
  manualModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  manualButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  manualPrimaryButton: {
    marginLeft: 8,
  },
  manualButtonPressed: {
    opacity: 0.8,
  },
  manualButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
  },
  manualPrimaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  trimInput: {
    paddingVertical: 0,
  },
});

export default VehicleCalibrationPage;
