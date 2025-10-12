// Utility to export table data as CSV

/**
 * Converts an array of objects to CSV string.
 * @param {Array} data - Array of objects (rows)
 * @param {Array} columns - Array of column definitions: { label, key }
 * @returns {string} CSV string
 */
export function toCSV(data, columns) {
  if (!data || !columns || data.length === 0) return "";

  // CSV header
  const header = columns.map((col) => `"${col.label}"`).join(",");

  // CSV rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        let cell = row[col.key];
        if (cell === null || cell === undefined) cell = "";
        // Escape quotes by doubling them
        if (typeof cell === "string") {
          cell = cell.replace(/"/g, '""');
        }
        return `"${cell}"`;
      })
      .join(","),
  );

  return [header, ...rows].join("\r\n");
}

/**
 * Triggers download of a CSV file in the browser.
 * @param {string} csvString - The CSV content
 * @param {string} filename - The filename for download
 */
export function downloadCSV(csvString, filename = "export.csv") {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  if (navigator.msSaveBlob) {
    // For IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const link = document.createElement("a");
    if (link.download !== undefined) {
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

/**
 * Export table data as CSV and trigger download.
 * @param {Array} data - Array of objects (rows)
 * @param {Array} columns - Array of column definitions: { label, key }
 * @param {string} filename - The filename for download
 */
export function exportTableToCSV(data, columns, filename = "export.csv") {
  const csv = toCSV(data, columns);
  downloadCSV(csv, filename);
}
