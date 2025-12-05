import React, { useMemo } from "react";

/**
 * TopPerformers
 * Displays the top 3 performing states/UTs with their rank, name, and score
 * @param {Array} states - Array of state objects with rank, name, totalScore, etc.
 */
const TopPerformers = ({ states = [] }) => {
  // Get top 3 states sorted by rank
  const topPerformers = useMemo(() => {
    if (!states || states.length === 0) return [];
    
    // Sort by rank (ascending - rank 1 is best)
    const sorted = [...states].sort((a, b) => {
      const rankA = a.rank || Number.MAX_SAFE_INTEGER;
      const rankB = b.rank || Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });
    
    return sorted.slice(0, 3);
  }, [states]);

  // Medal/rank icons
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  // Card colors - Matching traditional ranking medals (Gold, Silver, Bronze)
  // Category badges use: Blue (#2B5CB8), Green (#1A8F5A), Purple (#8B3BB2), Orange (#B26B3B)
  // Cards use: Gold, Silver, Bronze - traditional medal colors with good contrast
  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return { 
          border: "#D97706", // Gold border
          bg: "#FEF3C7", // Light gold background
          text: "#92400E", // Dark gold text
          shadow: "0 4px 12px rgba(217, 119, 6, 0.2)" // Gold shadow
        };
      case 2:
        return { 
          border: "#64748B", // Silver border
          bg: "#F1F5F9", // Light silver background
          text: "#475569", // Dark silver text
          shadow: "0 4px 12px rgba(100, 116, 139, 0.2)" // Silver shadow
        };
      case 3:
        return { 
          border: "#B45309", // Bronze border
          bg: "#FED7AA", // Light bronze background
          text: "#78350F", // Dark bronze text
          shadow: "0 4px 12px rgba(180, 83, 9, 0.2)" // Bronze shadow
        };
      default:
        return { 
          border: "#6B7280", 
          bg: "#F9FAFB", 
          text: "#374151",
          shadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
        };
    }
  };

  if (topPerformers.length === 0) {
    return (
      <div style={{
        background: "#F7F9FB",
        borderRadius: 12,
        padding: 32,
        textAlign: "center",
        color: "#666",
      }}>
        <div style={{ fontSize: 16 }}>No ranking data available</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        marginBottom: 32,
        flexWrap: "wrap",
      }}
    >
      {topPerformers.map((state, idx) => {
        const rank = state.rank || idx + 1;
        const colors = getRankColor(rank);
        
        return (
          <div
            key={state.name || idx}
            style={{
              background: colors.bg,
              borderRadius: 12,
              boxShadow: colors.shadow || "0 2px 8px rgba(44, 62, 80, 0.06)",
              padding: "24px 32px",
              minWidth: 280,
              flex: "1 1 280px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              borderLeft: `4px solid ${colors.border}`,
              position: "relative",
            }}
          >
            {/* Rank Badge */}
            <div style={{
              position: "absolute",
              top: 16,
              right: 16,
              fontSize: 24,
              fontWeight: 700,
            }}>
              {getRankIcon(rank)}
            </div>

            {/* Rank Label */}
            <div style={{ 
              fontSize: 12, 
              color: colors.text,
              fontWeight: 600,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Rank #{rank}
            </div>

            {/* State Name */}
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#1A1A1A",
              marginBottom: 12,
              lineHeight: 1.2,
            }}>
              {state.name || "N/A"}
            </div>

            {/* Score */}
            <div style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 8,
            }}>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: colors.text,
              }}>
                {typeof state.totalScore === 'number' 
                  ? state.totalScore.toFixed(2) 
                  : parseFloat(state.totalScore || 0).toFixed(2)}
              </div>
              <div style={{
                fontSize: 14,
                color: "#666",
                fontWeight: 500,
              }}>
                / 1000
              </div>
            </div>

            {/* Percentage */}
            <div style={{
              fontSize: 14,
              color: "#666",
              fontWeight: 500,
            }}>
              {(() => {
                // Try to get percentage from various possible fields
                let percentage = null;
                
                if (state.scorePercent !== undefined && state.scorePercent !== null) {
                  percentage = typeof state.scorePercent === 'number' 
                    ? state.scorePercent 
                    : parseFloat(state.scorePercent);
                } else if (state.percentage !== undefined && state.percentage !== null) {
                  percentage = typeof state.percentage === 'number'
                    ? state.percentage
                    : parseFloat(state.percentage);
                } else if (state.totalScore !== undefined && state.totalScore !== null) {
                  // Calculate percentage from totalScore (out of 1000)
                  const score = typeof state.totalScore === 'number'
                    ? state.totalScore
                    : parseFloat(state.totalScore || 0);
                  percentage = (score / 1000) * 100;
                }
                
                return percentage !== null && !isNaN(percentage)
                  ? `${percentage.toFixed(1)}%`
                  : "N/A";
              })()}
            </div>

            {/* Category Badge - Matching table badge colors */}
            {state.category && (
              <div style={{
                marginTop: 12,
                padding: "4px 12px",
                borderRadius: 8,
                background: state.category === "Leaders" ? "#E6F0FF" : // Light blue (matches table)
                           state.category === "Performers" ? "#E6F9F0" : // Light green (matches table)
                           state.category === "Challengers" ? "#F3E6FF" : // Light purple (matches table)
                           "#FFF3E6", // Light orange (matches table)
                color: state.category === "Leaders" ? "#2B5CB8" : // Blue text (matches table)
                       state.category === "Performers" ? "#1A8F5A" : // Green text (matches table)
                       state.category === "Challengers" ? "#8B3BB2" : // Purple text (matches table)
                       "#B26B3B", // Orange text (matches table)
                fontSize: 14,
                fontWeight: 600,
                display: "inline-block",
              }}>
                {state.category}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TopPerformers;

