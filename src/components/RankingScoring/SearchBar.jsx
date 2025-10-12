import React from "react";

/**
 * SearchBar
 * Renders a search input for filtering states by name.
 * @param {string} value - Current search value
 * @param {function} onChange - Callback when search value changes
 * @param {string} placeholder - Placeholder text for the input
 */
const SearchBar = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: "8px 16px",
        borderRadius: 6,
        border: "1px solid #D1D5DB",
        background: "#fff",
        fontSize: 15,
        minWidth: 180,
        outline: "none",
      }}
      aria-label="Search states"
    />
  );
};

export default SearchBar;
