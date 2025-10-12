import React from "react";

/**
 * Pagination
 * Renders pagination controls for navigating table pages.
 * @param {number} page - Current page (1-based)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when page changes
 * @param {number} [showing] - Number of items currently shown
 * @param {number} [totalItems] - Total number of items
 */
const Pagination = ({
  page,
  totalPages,
  onPageChange,
  showing,
  totalItems,
}) => {
  if (totalPages <= 1) return null;

  // Helper to generate page numbers (with ellipsis for large sets)
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginTop: 20,
        justifyContent: "flex-end",
      }}
    >
      {/* Showing info */}
      {typeof showing === "number" && typeof totalItems === "number" && (
        <span style={{ fontSize: 14, color: "#666", marginRight: 16 }}>
          Showing <b>{showing}</b> of <b>{totalItems}</b> items
        </span>
      )}

      {/* Prev button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{
          background: "#fff",
          border: "1px solid #D1D5DB",
          borderRadius: 6,
          padding: "4px 12px",
          fontSize: 15,
          color: page === 1 ? "#bbb" : "#2B5CB8",
          cursor: page === 1 ? "not-allowed" : "pointer",
        }}
        aria-label="Previous page"
      >
        &lt;
      </button>

      {/* Page numbers */}
      {pageNumbers.map((num, idx) =>
        num === "..." ? (
          <span key={idx} style={{ padding: "0 6px", color: "#888" }}>
            ...
          </span>
        ) : (
          <button
            key={num}
            type="button"
            onClick={() => onPageChange(num)}
            style={{
              background: num === page ? "#2B5CB8" : "#fff",
              color: num === page ? "#fff" : "#2B5CB8",
              border: "1px solid #D1D5DB",
              borderRadius: 6,
              padding: "4px 12px",
              fontWeight: num === page ? 700 : 500,
              cursor: num === page ? "default" : "pointer",
              margin: "0 2px",
            }}
            disabled={num === page}
            aria-current={num === page ? "page" : undefined}
          >
            {num}
          </button>
        )
      )}

      {/* Next button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={{
          background: "#fff",
          border: "1px solid #D1D5DB",
          borderRadius: 6,
          padding: "4px 12px",
          fontSize: 15,
          color: page === totalPages ? "#bbb" : "#2B5CB8",
          cursor: page === totalPages ? "not-allowed" : "pointer",
        }}
        aria-label="Next page"
      >
        &gt;
      </button>
    </div>
  );
};

export default Pagination;
