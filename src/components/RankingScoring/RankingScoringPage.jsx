import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../features/auth/AuthProvider";
import { rankingData } from "../../api/rankingData";
import { scoringService } from "../../services/scoring.service";
import StateRankingTable from "./StateRankingTable";
import Filters from "./Filters";
import SearchBar from "./SearchBar";
import InfoCards from "./InfoCards";
import BenchmarkingAnalysis from "./BenchmarkingAnalysis";
import ExportButton from "./ExportButton";

/**
 * Main Ranking & Scoring Page
 * - Loads data from real API with fallback to dummy data
 * - Handles filter, search, pagination, export
 * - Renders info cards, category legend, table, benchmarking, methodology
 */
const RankingScoringPage = () => {
  const { user } = useAuth();
  
  // State for filters, search, pagination
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Region");
  const [category, setCategory] = useState("Overall");
  const [page, setPage] = useState(1);
  const itemsPerPage = 7;

  // State for API data
  const [apiStates, setApiStates] = useState([]);
  const [apiStatistics, setApiStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract data from dummy API as fallback
  const { infoCards, categories, states, benchmarking, methodology } =
    rankingData;

  // Load data from API on component mount
  useEffect(() => {
    const loadScoringData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Ranking Page - Loading data for user role:", user?.role);

        // Load rankings and statistics in parallel based on user role
        const [rankingsData, statisticsData] = await Promise.all([
          scoringService.getRankingsByRole(user.role, user.state),
          scoringService.getStatistics()
        ]);

        console.log("🔍 Ranking Page - Received rankings data:", rankingsData);
        console.log("🔍 Ranking Page - Received statistics data:", statisticsData);

        // Transform API data to match expected format using scoring service
        const transformedStates = scoringService.transformRankingData(rankingsData);

        console.log("🔍 Ranking Page - Transformed states:", transformedStates);

        setApiStates(transformedStates);
        setApiStatistics(statisticsData);
      } catch (err) {
        console.error("Error loading scoring data:", err);
        setError(err.message);
        // Fallback to dummy data
        console.log("🔍 Ranking Page - Using fallback dummy data");
        setApiStates(states);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadScoringData();
    }
  }, [user]);


  // Use API data if available, otherwise fallback to dummy data
  const currentStates = apiStates.length > 0 ? apiStates : states;

  // Unique region list for filter dropdown
  const regionOptions = useMemo(() => {
    const allRegions = currentStates.map((s) => s.region).filter(Boolean);
    return ["All Region", ...Array.from(new Set(allRegions))];
  }, [currentStates]);

  // Filtering and searching logic
  const filteredStates = useMemo(() => {
    let filtered = [...currentStates];
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
  }, [currentStates, region, category, search]);

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


  // Show loading state
  if (loading) {
    return (
      <div className="ranking-scoring-page" style={{ padding: "32px 0" }}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading scoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="ranking-scoring-page" style={{ padding: "32px 0" }}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
