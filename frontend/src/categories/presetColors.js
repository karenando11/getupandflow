export const PRESET_CATEGORY_COLORS = [
  { value: "rose", label: "Rose", hex: "#f43f5e" },
  { value: "orange", label: "Orange", hex: "#f97316" },
  { value: "amber", label: "Amber", hex: "#f59e0b" },
  { value: "emerald", label: "Emerald", hex: "#10b981" },
  { value: "sky", label: "Sky", hex: "#0ea5e9" },
  { value: "indigo", label: "Indigo", hex: "#6366f1" },
];

export function getCategoryColorHex(color) {
  return PRESET_CATEGORY_COLORS.find((entry) => entry.value === color)?.hex || "#0f766e";
}
