import React, { useState, useMemo } from "react";
import { rankingData } from "../../api/rankingData";
import StateRankingTable from "./StateRankingTable";
import Filters from "./Filters";
import SearchBar from "./SearchBar";
import InfoCards from "./InfoCards";
import BenchmarkingAnalysis from "./BenchmarkingAnalysis";
import ExportButton from "./ExportButton";

/**
 * Main Ranking & Scoring Page
 * - Loads all data from dummy API
 * - Handles filter, search, pagination, export
 * - Renders info cards, category legend, table, benchmarking, methodology
 */
const RankingScoringPage = () => {
  // State for filters, search, pagination
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Region");
  const [category, setCategory] = useState("Overall");
  const [page, setPage] = useState(1);
  const itemsPerPage = 7;

  // Extract data from dummy API
  const { infoCards, categories, states, benchmarking, methodology } =
    rankingData;

  // Unique region list for filter dropdown
  const regionOptions = useMemo(() => {
    const allRegions = states.map((s) => s.region).filter(Boolean);
    return ["All Region", ...Array.from(new Set(allRegions))];
  }, [states]);

  // Filtering and searching logic
  const filteredStates = useMemo(() => {
    let filtered = [...states];
    if (region !== "All Region") {
      filtered = filtered.filter((s) => s.region === region);
    }
    if (category !== "Overall") {
      filtered = filtered.filter((s) => s.category === category);
    }
    if (search.trim()) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(search.trim().toLowerCase()),
      );
    }
    return filtered;
  }, [states, region, category, search]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStates.length / itemsPerPage);
  const paginatedStates = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredStates.slice(start, start + itemsPerPage);
  }, [filteredStates, page, itemsPerPage]);

  // Handle filter/search/pagination changes
  const handleRegionChange = (val) => {
    setRegion(val);
    setPage(1);
  };
  const handleCategoryChange = (val) => {
    setCategory(val);
    setPage(1);
  };
  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };
  const handlePageChange = (val) => setPage(val);

  // Export handler
  const handleExport = () => {
    // Export all filtered states, not just current page
    // Table columns defined in StateRankingTable
    window.dispatchEvent(
      new CustomEvent("export-states-table", { detail: filteredStates }),
    );
  };

  return (
    <div className="ranking-scoring-page " style={{ padding: "32px 0" }}>
      {/* Info Cards */}
      <InfoCards cards={infoCards} />

      {/* Category Legend */}
      <div style={{ display: "flex", gap: 16, margin: "24px 0" }}>
        {categories.map((cat) => (
          <div
            key={cat.name}
            style={{
              background: cat.color,
              borderRadius: 8,
              padding: "12px 20px",
              minWidth: 180,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div style={{ fontWeight: 600 }}>{cat.name}</div>
            <div style={{ fontSize: 13, color: "#666" }}>{cat.range}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              {cat.description}
            </div>
          </div>
        ))}
      </div>

      {/* Table Controls */}
      <div
        className="bg-white rounded-lg shadow-sm border p-6"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search States"
        />
        <Filters
          region={region}
          regionOptions={regionOptions}
          category={category}
          categoryOptions={["Overall", ...categories.map((c) => c.name)]}
          onRegionChange={handleRegionChange}
          onCategoryChange={handleCategoryChange}
        />
        <ExportButton onClick={handleExport} />
      </div>

      {/* State Ranking Table */}
      <StateRankingTable
        states={paginatedStates}
        page={page}
        totalPages={totalPages}
        totalItems={filteredStates.length}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
      />

      {/* Benchmarking Analysis */}
      <BenchmarkingAnalysis benchmarking={benchmarking} />

      {/* Methodology Section */}
      <div
        style={{
          background: "#F7F9FB",
          borderRadius: 12,
          padding: 24,
          marginTop: 32,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
          About NIRI Methodology
        </div>
        <div style={{ fontSize: 15, color: "#3A3A3A", marginBottom: 12 }}>
          {methodology.description}
        </div>
        <ul style={{ marginBottom: 12 }}>
          {methodology.pillars.map((pillar) => (
            <li key={pillar.name} style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: "#2B5CB8" }}>
                {pillar.name} ({pillar.points}):
              </span>{" "}
              <span style={{ color: "#444" }}>{pillar.details}</span>
            </li>
          ))}
        </ul>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
          {methodology.note}
        </div>
        <div style={{ fontSize: 12, color: "#888" }}>{methodology.period}</div>
      </div>
    </div>
  );
};

export default RankingScoringPage;
