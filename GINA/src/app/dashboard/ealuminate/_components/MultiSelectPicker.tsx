"use client";

import Select, { type StylesConfig } from "react-select";

export interface MultiSelectOption {
  value: string;
  label: string;
}

const PICKER_STYLES: StylesConfig<MultiSelectOption, false> = {
  control: (base, state) => ({
    ...base,
    border: state.isFocused ? "1px solid #4479DA" : "1px solid #d1d9e0",
    boxShadow: "none",
    borderRadius: "0.875rem",
    minHeight: "42px",
    "&:hover": { borderColor: state.isFocused ? "#4479DA" : "#d1d9e0" },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#eef3ff"
      : state.isFocused
        ? "#f8fafc"
        : "#ffffff",
    color: state.isDisabled
      ? "#cbd5e1"
      : state.isSelected
        ? "#4479DA"
        : "#1e293b",
    fontWeight: state.isSelected ? 600 : 400,
    cursor: state.isDisabled ? "not-allowed" : "pointer",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 200,
  }),
  placeholder: (base) => ({
    ...base,
    color: "#94a3b8",
  }),
};

function OptionLabel({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
      }}
    >
      <span>{label}</span>
      {selected && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4479DA"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </div>
  );
}

// Generic searchable single-select with a checkmark on the selected option.
// Shares styling with MultiSelectPicker below.
export function SingleSelectPicker({
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: readonly MultiSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const selectedOption = options.find((o) => o.value === value) ?? null;

  return (
    <Select<MultiSelectOption, false>
      options={options as MultiSelectOption[]}
      value={selectedOption}
      onChange={(option) => {
        if (option) onChange(option.value);
      }}
      placeholder={placeholder}
      isSearchable
      formatOptionLabel={(option, meta) => (
        <OptionLabel
          label={option.label}
          selected={meta.context === "menu" && option.value === value}
        />
      )}
      classNamePrefix="single-select"
      styles={PICKER_STYLES}
    />
  );
}

interface MultiSelectPickerProps {
  options: readonly MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  maxSelected?: number;
  required?: boolean;
}

// Generic searchable multi-select with a stay-open menu, checkmarks on
// selected options, and removable chips below the control.
export default function MultiSelectPicker({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  maxSelected,
  required,
}: MultiSelectPickerProps) {
  const atCap = maxSelected !== undefined && selected.length >= maxSelected;

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else if (!atCap) {
      onChange([...selected, value]);
    }
  };

  const labelFor = (value: string) =>
    options.find((o) => o.value === value)?.label ?? value;

  return (
    <div>
      <Select<MultiSelectOption, false>
        options={options as MultiSelectOption[]}
        value={null}
        onChange={(option) => {
          if (option) toggle(option.value);
        }}
        placeholder={
          selected.length > 0
            ? `${selected.length}${
                maxSelected !== undefined ? ` of ${maxSelected}` : ""
              } selected`
            : placeholder
        }
        isSearchable
        closeMenuOnSelect={false}
        blurInputOnSelect={false}
        hideSelectedOptions={false}
        isOptionSelected={(option) => selected.includes(option.value)}
        isOptionDisabled={(option) => atCap && !selected.includes(option.value)}
        formatOptionLabel={(option) => (
          <OptionLabel
            label={option.label}
            selected={selected.includes(option.value)}
          />
        )}
        classNamePrefix="multi-select"
        styles={{
          ...PICKER_STYLES,
          placeholder: (base) => ({
            ...base,
            color: selected.length > 0 ? "#1e293b" : "#94a3b8",
          }),
        }}
      />
      {selected.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
            marginTop: "0.5rem",
          }}
        >
          {selected.map((value) => (
            <span
              key={value}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.2rem 0.65rem",
                borderRadius: "999px",
                backgroundColor: "#4479DA",
                color: "#fff",
                fontSize: "0.8125rem",
                fontWeight: 500,
              }}
            >
              {labelFor(value)}
              <button
                type="button"
                onClick={() => onChange(selected.filter((v) => v !== value))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label={`Remove ${labelFor(value)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {required && selected.length === 0 && (
        <input
          aria-hidden="true"
          value=""
          onChange={() => {}}
          required
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        />
      )}
    </div>
  );
}
