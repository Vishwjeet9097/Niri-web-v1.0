import React from "react";

/**
 * Filters
 * Renders dropdowns for Region and Category filtering.
 * @param {string} region - Current selected region
 * @param {Array} regionOptions - Array of region options
 * @param {string} category - Current selected category
 * @param {Array} categoryOptions - Array of category options
 * @param {function} onRegionChange - Callback for region change
 * @param {function} onCategoryChange - Callback for category change
 */
const Filters = ({
  region,
  regionOptions,
  category,
  categoryOptions,
  onRegionChange,
  onCategoryChange,
}) => {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* Region Dropdown */}
      <select
        value={region}
        onChange={(e) => onRegionChange(e.target.value)}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "1px solid #D1D5DB",
          background: "#fff",
          fontSize: 15,
          minWidth: 120,
        }}
      >
        {regionOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {/* Category Dropdown */}
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "1px solid #D1D5DB",
          background: "#fff",
          fontSize: 15,
          minWidth: 120,
        }}
      >
        {categoryOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Filters;
