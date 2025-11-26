import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../features/auth/AuthProvider";
import { scoringService } from "../../services/scoring.service";
import StateRankingTable from "./StateRankingTable";
import Filters from "./Filters";
import SearchBar from "./SearchBar";
import InfoCards from "./InfoCards";
import BenchmarkingAnalysis from "./BenchmarkingAnalysis";
import ExportButton from "./ExportButton";

/**
 * Main Ranking & Scoring Page
 * - Loads data from real API only
 * - Shows no data message when API data is not available
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
  const [hasData, setHasData] = useState(false);

  // Static data for UI elements (not ranking data)
  const infoCards = [
    {
      label: "Total States/UTs",
      value: apiStates.length > 0 ? apiStates.length.toString() : "0",
      sub: "With ranking data",
      icon: "trophy",
    },
    {
      label: "Average Score",
      value: apiStatistics?.averageScore ? apiStatistics.averageScore.toFixed(1) : "N/A",
      sub: "Across all states",
      icon: "score",
    },
    {
      label: "Highest Score",
      value: apiStatistics?.highestScore ? apiStatistics.highestScore.toString() : "N/A",
      sub: "Top performing state",
      icon: "category",
    },
  ];

  const categories = [
    {
      name: "Leaders",
      range: ">600",
      color: "#E6F0FF",
      description: "Top performing states",
    },
    {
      name: "Performers", 
      range: "400-600 pts",
      color: "#E6F9F0",
      description: "Good performance",
    },
    {
      name: "Challengers",
      range: "200-400 pts", 
      color: "#F3E6FF",
      description: "Needs improvement",
    },
    {
      name: "Strivers",
      range: "<200 pts",
      color: "#FFF3E6", 
      description: "Requires support",
    },
  ];

  const benchmarking = {
    vsTopPerformer: {
      label: "vs Top Performer",
      performer: "Karnataka",
      value: apiStatistics?.averageScore ? `${apiStatistics.averageScore.toFixed(1)} pts` : "N/A",
      description: "Compared to best performing state",
      color: "blue"
    },
    vsAllStates: {
      label: "vs All States",
      performer: "National Average",
      value: apiStatistics?.averageScore ? `${apiStatistics.averageScore.toFixed(1)} pts` : "N/A",
      description: "Compared to national average",
      color: "green"
    },
    vsPrevQuarter: {
      label: "vs Previous Quarter",
      performer: "Growth",
      value: "+5.2%",
      description: "Quarter-over-quarter improvement",
      color: "green"
    }
  };

  const methodology = {
    description: "The NIRI (National Infrastructure Ranking Index) evaluates states based on four key pillars of infrastructure development.",
    pillars: [
      {
        name: "Infrastructure Financing",
        points: "250",
        details: "Measures the state's ability to mobilize financial resources for infrastructure development.",
      },
      {
        name: "Infrastructure Development", 
        points: "250",
        details: "Evaluates the actual infrastructure assets and their quality across various sectors.",
      },
      {
        name: "Public-Private Partnerships",
        points: "250", 
        details: "Assesses the state's effectiveness in leveraging private sector participation.",
      },
      {
        name: "Enablers",
        points: "250",
        details: "Measures the policy and regulatory environment that supports infrastructure development.",
      },
    ],
    note: "Each pillar is scored out of 250 points, with a total possible score of 1000 points.",
    period: "Data is updated quarterly based on the latest available information from state governments.",
  };

  // Function to load scoring data
  const loadScoringData = async () => {
    try {
      setLoading(true);
      setError(null);
      setHasData(false);

      console.log("🔍 Ranking Page - Loading data for user role:", user?.role);

      // Load rankings and statistics in parallel based on user role
      const [rankingsData, statisticsData] = await Promise.all([
        scoringService.getRankingsByRole(user.role, user.state),
        scoringService.getStatistics()
      ]);

      console.log("🔍 Ranking Page - Received rankings data:", rankingsData);
      console.log("🔍 Ranking Page - Received statistics data:", statisticsData);

      // Check if we have valid data
      if (rankingsData && rankingsData.length > 0) {
        // Transform API data to match expected format using scoring service
        const transformedStates = scoringService.transformRankingData(rankingsData);
        console.log("🔍 Ranking Page - Transformed states:", transformedStates);
        
        setApiStates(transformedStates);
        setApiStatistics(statisticsData);
        setHasData(true);
      } else {
        console.log("🔍 Ranking Page - No ranking data available");
        setApiStates([]);
        setApiStatistics(null);
        setHasData(false);
      }
    } catch (err) {
      console.error("Error loading scoring data:", err);
      setError(err.message);
      setApiStates([]);
      setApiStatistics(null);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  // Load data from API on component mount
  useEffect(() => {
    if (user) {
      loadScoringData();
    }
  }, [user]);

  // Listen for score update events (when MOSPI Approver approves a submission)
  useEffect(() => {
    const handleScoreUpdate = async (event) => {
      console.log("🔄 Ranking Page - Score update event received:", event.detail);
      // Wait a moment for backend to finish calculating and saving the score
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Refresh the ranking data when a new score is calculated
      if (user) {
        console.log("🔄 Ranking Page - Refreshing ranking data after score update...");
        await loadScoringData();
      }
    };

    window.addEventListener('niri-score-updated', handleScoreUpdate);

    return () => {
      window.removeEventListener('niri-score-updated', handleScoreUpdate);
    };
  }, [user]);


  // Use API data only
  const currentStates = apiStates;

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

  // Show no data state
  if (!loading && !hasData) {
    return (
      <div className="ranking-scoring-page" style={{ padding: "32px 0" }}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Ranking & Scoring Data Available</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Currently, there is no ranking and scoring data available. The data will be displayed here once it becomes available from the API.
          </p>
          <div className="text-sm text-gray-500">
            <p>This could be because:</p>
            <ul className="mt-2 space-y-1">
              <li>• No states have submitted their data yet</li>
              <li>• Data is still being processed</li>
              <li>• The ranking calculation is in progress</li>
            </ul>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
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
