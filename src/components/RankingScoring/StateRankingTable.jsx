import React from "react";
import Pagination from "./Pagination";

/**
 * StateRankingTable
 * Renders the main ranking table for states/UTs with all columns, highlighting user state,
 * and supports pagination.
 *
 * @param {Array} states - Array of state objects for the current page
 * @param {number} page - Current page number (1-based)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of filtered items
 * @param {number} itemsPerPage - Number of items per page
 * @param {function} onPageChange - Callback for page change
 */
const StateRankingTable = ({
  states,
  page,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  // Table columns definition
  const columns = [
    { label: "State/UT", key: "name", width: 200 },
    { label: "Total Score", key: "totalScore", width: 110 },
    { label: "Financing", key: "financing", width: 90 },
    { label: "Development", key: "development", width: 110 },
    { label: "PPP", key: "ppp", width: 80 },
    { label: "Enablers", key: "enablers", width: 90 },
    { label: "Category", key: "category", width: 120 },
    { label: "YoY Change", key: "yoyChange", width: 90 },
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

  // Helper to highlight user state row
  const getRowStyle = (isUserState) =>
    isUserState
      ? {
          background: "#2B5CB8",
          color: "#fff",
          fontWeight: 600,
        }
      : {};

  // Helper to get text color for user state row
  const getCellTextColor = (isUserState) =>
    isUserState ? { color: "#fff" } : {};

  // Helper to get score percent string
  const getScorePercent = (scorePercent) =>
    typeof scorePercent === "number"
      ? `Score: ${scorePercent.toFixed(1)}%`
      : "";

  // Helper to get category range
  const getCategoryRange = (state) =>
    state.categoryRange ? state.categoryRange : "";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(44, 62, 80, 0.06)",
        padding: "0 0 12px 0",
        overflowX: "auto",
      }}
    >
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
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: "left",
                  padding: "16px 12px",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#2B5CB8",
                  background: "#F7F9FB",
                  borderBottom: "1.5px solid #E5EAF2",
                  minWidth: col.width,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {states.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ textAlign: "center", padding: 32 }}
              >
                No states found.
              </td>
            </tr>
          ) : (
            states.map((state, idx) => (
              <tr
                key={state.id || state.name}
                style={{
                  ...getRowStyle(state.isUserState),
                  borderBottom: "1px solid #F0F0F0",
                }}
              >
                {/* State/UT */}
                <td
                  style={{
                    padding: "14px 12px",
                    ...getCellTextColor(state.isUserState),
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {state.isUserState && (
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
                        Your State
                      </span>
                    )}
                    <span>{state.name}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: state.isUserState ? "#fff" : "#888",
                      marginTop: 2,
                    }}
                  >
                    {getScorePercent(state.scorePercent)}
                  </div>
                </td>
                {/* Total Score */}
                <td
                  style={{
                    padding: "14px 12px",
                    ...getCellTextColor(state.isUserState),
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 20 }}>
                    {state.totalScore}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: state.isUserState ? "#fff" : "#888",
                      marginLeft: 4,
                    }}
                  >
                    /1000
                  </span>
                </td>
                {/* Financing */}
                <td
                  style={{
                    padding: "14px 12px",
                    ...getCellTextColor(state.isUserState),
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{state.financing}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: state.isUserState ? "#fff" : "#888",
                      marginLeft: 2,
                    }}
                  >
                    /250
                  </span>
                </td>
                {/* Development */}
                <td
                  style={{
                    padding: "14px 12px",
                    ...getCellTextColor(state.isUserState),
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{state.development}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: state.isUserState ? "#fff" : "#888",
                      marginLeft: 2,
                    }}
                  >
                    /250
                  </span>
                </td>
                {/* PPP */}
                <td
                  style={{
                    padding: "14px 12px",
                    ...getCellTextColor(state.isUserState),
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{state.ppp}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: state.isUserState ? "#fff" : "#888",
                      marginLeft: 2,
                    }}
                  >
                    /250
                  </span>
                </td>
                {/* Enablers */}
                <td
                  style={{
                    padding: "14px 12px",
                    ...getCellTextColor(state.isUserState),
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{state.enablers}</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: state.isUserState ? "#fff" : "#888",
                      marginLeft: 2,
                    }}
                  >
                    /250
                  </span>
                </td>
                {/* Category */}
                <td style={{ padding: "14px 12px" }}>
                  <span
                    style={{
                      ...getCategoryBadgeStyle(state.category),
                      borderRadius: 8,
                      padding: "4px 12px",
                      fontWeight: 600,
                      fontSize: 14,
                      display: "inline-block",
                    }}
                  >
                    {state.category}
                  </span>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                    {getCategoryRange(state)}
                  </div>
                </td>
                {/* YoY Change */}
                <td style={{ padding: "14px 12px" }}>
                  {getYoYChange(state.yoyChange)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Pagination */}
      <div style={{ padding: "0 24px" }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          showing={states.length}
          totalItems={totalItems}
        />
      </div>
    </div>
  );
};

export default StateRankingTable;
