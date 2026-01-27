import React from "react";
import Pagination from "./Pagination";

/**
 * MinistryRankingTable
 * Renders the main ranking table for ministries with all columns, highlighting user ministry,
 * and supports pagination.
 *
 * @param {Array} ministries - Array of ministry objects for the current page
 * @param {number} page - Current page number (1-based)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of filtered items
 * @param {number} itemsPerPage - Number of items per page
 * @param {function} onPageChange - Callback for page change
 */
const MinistryRankingTable = ({
  ministries,
  page,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  // Table columns definition
  const columns = [
    { label: "Ministry", key: "name", width: 200 },
    { label: "Total Score", key: "totalScore", width: 110 },
    { label: "Financing", key: "financing", width: 90 },
    { label: "Development", key: "development", width: 110 },
    { label: "PPP", key: "ppp", width: 80 },
    { label: "Enablers", key: "enablers", width: 90 },
    { label: "Category", key: "category", width: 120 },
    // { label: "YoY Change", key: "yoyChange", width: 90 },
  ];

  // Helper to get category badge color
  const getCategoryBadgeStyle = (category) => {
    switch (category) {
      case "Leaders":
        return {
          background: "#E6F0FF",
          color: "#2B5CB8",
        };
      case "Performers":
        return {
          background: "#E6F9F0",
          color: "#1A8F5A",
        };
      case "Challengers":
        return {
          background: "#F3E6FF",
          color: "#8B3BB2",
        };
      case "Strivers":
        return {
          background: "#FFF3E6",
          color: "#B26B3B",
        };
      default:
        return {
          background: "#F0F0F0",
          color: "#444",
        };
    }
  };

  // Helper to get YoY change color and arrow
  const getYoYChange = (change) => {
    if (change > 0) {
      return (
        <span style={{ color: "#1A8F5A", fontWeight: 600 }}>
          <span style={{ fontSize: 16, verticalAlign: "middle" }}>↑</span> +
          {change}
        </span>
      );
    }
    if (change < 0) {
      return (
        <span style={{ color: "#B23B3B", fontWeight: 600 }}>
          <span style={{ fontSize: 16, verticalAlign: "middle" }}>↓</span>{" "}
          {change}
        </span>
      );
    }
    return <span style={{ color: "#888" }}>0</span>;
  };

  // Helper to highlight user ministry row
  const getRowStyle = (isUserMinistry) =>
    isUserMinistry
      ? {
          background: "#fff",
          color: "#000",
          fontWeight: 600,
          borderLeft: "4px solid #2B5CB8",
        }
      : {};

  // Helper to get text color for user ministry row
  const getCellTextColor = (isUserMinistry) =>
    isUserMinistry ? { color: "#000" } : {};

  // Helper to get score percent string
  const getScorePercent = (scorePercent) =>
    typeof scorePercent === "number"
      ? `Score: ${scorePercent.toFixed(1)}%`
      : "";

  // Helper to get category range
  const getCategoryRange = (ministry) =>
    ministry.categoryRange ? ministry.categoryRange : "";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(44, 62, 80, 0.06)",
        padding: "0",
        overflowX: "auto",
        border: "1px solid #E5E7EB",
        borderBottom: "1px solid #E5E7EB",
        overflowY: "visible",
        position: "relative",
        zIndex: 0,
      }}
    >
      <div style={{ overflowX: "auto", overflowY: "visible" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            minWidth: 900,
          }}
        >
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key}
                style={{
                  textAlign: "left",
                  padding: idx === 0 ? "18px 24px" : (idx === columns.length - 1 ? "18px 24px" : "18px 16px"),
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#2B5CB8",
                  background: "#F7F9FB",
                  borderBottom: "2px solid #E5E7EB",
                  minWidth: col.width,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ministries.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ 
                  textAlign: "center", 
                  padding: 48,
                  color: "#666",
                  fontSize: 15,
                }}
              >
                No ministries found.
              </td>
            </tr>
          ) : (
            ministries.map((ministry, idx) => (
              <tr
                key={ministry.id || ministry.name}
                style={{
                  ...getRowStyle(ministry.isUserMinistry),
                  borderBottom: "1px solid #F0F0F0",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!ministry.isUserMinistry) {
                    e.currentTarget.style.backgroundColor = "#F9FAFB";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!ministry.isUserMinistry) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {/* Ministry */}
                <td
                  style={{
                    padding: "16px 24px",
                    ...getCellTextColor(ministry.isUserMinistry),
                    verticalAlign: "top",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {ministry.isUserMinistry && (
                      <span
                        style={{
                          background: "#FFB23B",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 12,
                          borderRadius: 6,
                          padding: "2px 8px",
                          marginRight: 6,
                        }}
                      >
                        Your Ministry
                      </span>
                    )}
                    <span>{ministry.name}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: ministry.isUserMinistry ? "#666" : "#888",
                      marginTop: 2,
                    }}
                  >
                    {getScorePercent(ministry.scorePercent)}
                  </div>
                </td>
                {/* Total Score */}
                <td
                  style={{
                    padding: "16px 16px",
                    ...getCellTextColor(ministry.isUserMinistry),
                    verticalAlign: "top",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 20 }}>
                    {ministry.totalScore}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: ministry.isUserMinistry ? "#666" : "#888",
                      marginLeft: 4,
                    }}
                  >
                    /1000
                  </span>
                </td>
                {/* Financing */}
                <td
                  style={{
                    padding: "16px 16px",
                    ...getCellTextColor(ministry.isUserMinistry),
                    verticalAlign: "top",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{ministry.financing}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: ministry.isUserMinistry ? "#666" : "#888",
                      marginLeft: 2,
                    }}
                  >
                    /250
                  </span>
                </td>
                {/* Development */}
                <td
                  style={{
                    padding: "16px 16px",
                    ...getCellTextColor(ministry.isUserMinistry),
                    verticalAlign: "top",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{ministry.development}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: ministry.isUserMinistry ? "#666" : "#888",
                      marginLeft: 2,
                    }}
                  >
                    /250
                  </span>
                </td>
                {/* PPP */}
                <td
                  style={{
                    padding: "16px 16px",
                    ...getCellTextColor(ministry.isUserMinistry),
                    verticalAlign: "top",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{ministry.ppp}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: ministry.isUserMinistry ? "#666" : "#888",
                      marginLeft: 2,
                    }}
                  >
                    /250
                  </span>
                </td>
                {/* Enablers */}
                <td
                  style={{
                    padding: "16px 16px",
                    ...getCellTextColor(ministry.isUserMinistry),
                    verticalAlign: "top",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{ministry.enablers}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: ministry.isUserMinistry ? "#666" : "#888",
                      marginLeft: 2,
                    }}
                  >
                    /250
                  </span>
                </td>
                {/* Category */}
                <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                  <span
                    style={{
                      ...getCategoryBadgeStyle(ministry.category),
                      borderRadius: 8,
                      padding: "4px 12px",
                      fontWeight: 600,
                      fontSize: 14,
                      display: "inline-block",
                    }}
                  >
                    {ministry.category}
                  </span>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                    {getCategoryRange(ministry)}
                  </div>
                </td>
                {/* YoY Change */}
                {/* <td style={{ padding: "14px 12px" }}>
                  {getYoYChange(ministry.yoyChange)}
                </td> */}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
      {/* Pagination */}
      <div style={{ 
        padding: "16px 24px", 
        borderTop: "1px solid #F0F0F0",
        borderBottom: "1px solid #E5E7EB",
        background: "#fff",
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        position: "relative",
        zIndex: 0,
      }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          showing={ministries.length}
          totalItems={totalItems}
        />
      </div>
    </div>
  );
};

export default MinistryRankingTable;
