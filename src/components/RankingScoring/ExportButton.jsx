import React, { useEffect } from "react";
import { exportTableToCSV } from "../../utils/exportUtils";

/**
 * ExportButton
 * Renders a button to export the current table data as CSV.
 * Listens for a custom event "export-states-table" to receive data to export.
 *
 * @param {function} [onClick] - Optional click handler to trigger export event.
 */
const ExportButton = ({ onClick }) => {
  useEffect(() => {
    // Listen for export event and trigger CSV export
    const handleExport = (e) => {
      const data = e.detail;
      if (!Array.isArray(data) || data.length === 0) return;

      // Define columns for export (should match table columns)
      const columns = [
        { label: "State/UT", key: "name" },
        { label: "Total Score", key: "totalScore" },
        { label: "Financing", key: "financing" },
        { label: "Development", key: "development" },
        { label: "PPP", key: "ppp" },
        { label: "Enablers", key: "enablers" },
        { label: "Category", key: "category" },
        { label: "Category Range", key: "categoryRange" },
        { label: "YoY Change", key: "yoyChange" },
        { label: "Score (%)", key: "scorePercent" },
        { label: "Region", key: "region" },
      ];

      exportTableToCSV(data, columns, "niri_states_ranking.csv");
    };

    window.addEventListener("export-states-table", handleExport);
    return () => window.removeEventListener("export-states-table", handleExport);
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "#2B5CB8",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "8px 20px",
        fontWeight: 600,
        fontSize: 15,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
      aria-label="Export table data"
    >
      <svg
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 20 20"
        style={{ marginRight: 6 }}
        aria-hidden="true"
      >
        <path
          d="M10 2v11m0 0l-4-4m4 4l4-4M3 16h14"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Export
    </button>
  );
};

export default ExportButton;
