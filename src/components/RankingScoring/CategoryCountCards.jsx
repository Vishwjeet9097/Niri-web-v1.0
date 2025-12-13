import React, { useMemo } from "react";

/**
 * CategoryCountCards
 * Renders cards showing the count of states in each category (Leaders, Performers, Challengers, Strivers)
 * @param {Array} states - Array of state objects with category property
 * @param {Array} categories - Array of category definitions with name, color, etc.
 * @param {Function} onCategoryClick - Callback function when a category card is clicked
 * @param {String} selectedCategory - Currently selected category name (or "Overall")
 */
const CategoryCountCards = ({ states = [], categories = [], onCategoryClick, selectedCategory = "Overall" }) => {
  // Get category colors for text and border (darker, more vibrant)
  const getCategoryColors = (categoryName) => {
    switch (categoryName) {
      case "Leaders":
        return {
          borderColor: "#2B5CB8",
          textColor: "#2B5CB8",
          bgColor: "#E6F0FF",
        };
      case "Performers":
        return {
          borderColor: "#1A8F5A",
          textColor: "#1A8F5A",
          bgColor: "#E6F9F0",
        };
      case "Challengers":
        return {
          borderColor: "#8B3BB2",
          textColor: "#8B3BB2",
          bgColor: "#F3E6FF",
        };
      case "Strivers":
        return {
          borderColor: "#B26B3B",
          textColor: "#B26B3B",
          bgColor: "#FFF3E6",
        };
      default:
        return {
          borderColor: "#2B5CB8",
          textColor: "#2B5CB8",
          bgColor: "#E6F0FF",
        };
    }
  };

  // Count states by category
  const categoryCounts = useMemo(() => {
    const counts = {
      Leaders: 0,
      Performers: 0,
      Challengers: 0,
      Strivers: 0,
    };

    states.forEach((state) => {
      if (state.category && counts.hasOwnProperty(state.category)) {
        counts[state.category]++;
      }
    });

    return counts;
  }, [states]);

  // Create cards array from categories
  const categoryCards = useMemo(() => {
    return categories.map((cat) => {
      const colors = getCategoryColors(cat.name);
      return {
        label: cat.name,
        value: categoryCounts[cat.name]?.toString() || "0",
        sub: cat.description || `${cat.range} score range`,
        range: cat.range,
        ...colors,
      };
    });
  }, [categories, categoryCounts]);

  // Handle card click
  const handleCardClick = (categoryName) => {
    if (onCategoryClick) {
      // If clicking the same category, reset to "Overall"
      const newCategory = selectedCategory === categoryName ? "Overall" : categoryName;
      onCategoryClick(newCategory);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        marginBottom: 28,
        flexWrap: "wrap",
      }}
    >
      {categoryCards.map((card, idx) => {
        const isSelected = selectedCategory === card.label;
        return (
          <div
            key={card.label}
            onClick={() => handleCardClick(card.label)}
            style={{
              background: card.bgColor || "#fff",
              borderRadius: 12,
              boxShadow: isSelected 
                ? "0 4px 12px rgba(44, 62, 80, 0.15)" 
                : "0 2px 8px rgba(44, 62, 80, 0.06)",
              padding: "20px 32px",
              minWidth: 210,
              flex: "1 1 210px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              borderLeftWidth: "4px",
              borderLeftStyle: "solid",
              borderLeftColor: card.borderColor || "#2B5CB8",
              borderTopWidth: isSelected ? "2px" : "0",
              borderTopStyle: isSelected ? "solid" : "none",
              borderTopColor: isSelected ? (card.borderColor || "#2B5CB8") : "transparent",
              borderRightWidth: isSelected ? "2px" : "0",
              borderRightStyle: isSelected ? "solid" : "none",
              borderRightColor: isSelected ? (card.borderColor || "#2B5CB8") : "transparent",
              borderBottomWidth: isSelected ? "2px" : "0",
              borderBottomStyle: isSelected ? "solid" : "none",
              borderBottomColor: isSelected ? (card.borderColor || "#2B5CB8") : "transparent",
              transition: "all 0.3s ease",
              cursor: "pointer",
              transform: isSelected ? "translateY(-2px)" : "translateY(0)",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(44, 62, 80, 0.12)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(44, 62, 80, 0.06)";
              } else {
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
          >
          <div style={{ fontSize: 13, color: "#666", marginBottom: 4, fontWeight: 600 }}>
            {card.label}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 32,
              color: card.textColor || "#2B5CB8",
              marginBottom: 4,
            }}
          >
            {card.value}
          </div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 2, fontWeight: 500 }}>
            {card.range}
          </div>
          <div style={{ fontSize: 13, color: "#888" }}>{card.sub}</div>
        </div>
        );
      })}
    </div>
  );
};

export default CategoryCountCards;
