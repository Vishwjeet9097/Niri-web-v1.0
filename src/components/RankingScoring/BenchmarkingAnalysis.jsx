import React from "react";

/**
 * BenchmarkingAnalysis
 * Renders benchmarking cards comparing performance against key benchmarks.
 * @param {object} benchmarking - Object with vsTopPerformer, vsAllStates, vsPrevQuarter
 */
const BenchmarkingAnalysis = ({ benchmarking }) => {
  if (!benchmarking) return null;

  // Safely access properties with fallbacks
  const cards = [
    {
      title: benchmarking.vsTopPerformer?.label || "vs Top Performer",
      performer: benchmarking.vsTopPerformer?.performer || "N/A",
      value: benchmarking.vsTopPerformer?.value || "N/A",
      description: benchmarking.vsTopPerformer?.description || "No data available",
      color: benchmarking.vsTopPerformer?.color || "blue",
    },
    {
      title: benchmarking.vsAllStates?.label || "vs All States",
      performer: benchmarking.vsAllStates?.performer || "N/A",
      value: benchmarking.vsAllStates?.value || "N/A",
      description: benchmarking.vsAllStates?.description || "No data available",
      color: benchmarking.vsAllStates?.color || "green",
    },
    {
      title: benchmarking.vsPrevQuarter?.label || "vs Previous Quarter",
      performer: benchmarking.vsPrevQuarter?.performer || "N/A",
      value: benchmarking.vsPrevQuarter?.value || "N/A",
      description: benchmarking.vsPrevQuarter?.description || "No data available",
      color: benchmarking.vsPrevQuarter?.color || "green",
    },
  ];

  const getValueColor = (color) => {
    if (color === "red") return "#B23B3B";
    if (color === "green") return "#1A8F5A";
    return "#2B5CB8";
  };

  return (
    <div
      style={{
        margin: "36px 0 24px 0",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(44, 62, 80, 0.06)",
        padding: "24px 32px",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>
        Benchmarking Analysis
      </div>
      <div style={{ fontSize: 15, color: "#3A3A3A", marginBottom: 18 }}>
        Compare your performance against key benchmarks
      </div>
      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            style={{
              background: "#F7F9FB",
              borderRadius: 10,
              padding: "18px 24px",
              minWidth: 260,
              flex: "1 1 260px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              borderLeft: `4px solid ${getValueColor(card.color)}`,
            }}
          >
            <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>
              {card.title}
            </div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "#2B5CB8" }}>
              {card.performer}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 22,
                color: getValueColor(card.color),
                margin: "4px 0",
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: 13, color: "#666" }}>{card.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BenchmarkingAnalysis;
