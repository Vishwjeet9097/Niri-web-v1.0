import React from "react";

/**
 * InfoCards
 * Renders summary cards for National Rank, NIRI Score, Best Category, Score Gap, etc.
 * @param {Array} cards - Array of card objects: { label, value, sub, icon }
 */
const InfoCards = ({ cards }) => {
  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        marginBottom: 28,
        flexWrap: "wrap",
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={card.label}
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(44, 62, 80, 0.06)",
            padding: "20px 32px",
            minWidth: 210,
            flex: "1 1 210px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            borderLeft: idx === 0 ? "4px solid #2B5CB8" : "none",
          }}
        >
          <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>
            {card.label}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 28,
              color: "#2B5CB8",
              marginBottom: 2,
            }}
          >
            {card.value}
          </div>
          <div style={{ fontSize: 13, color: "#B23B3B" }}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
};

export default InfoCards;
