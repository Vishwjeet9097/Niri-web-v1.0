import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../features/auth/AuthProvider";
import { scoringService } from "../../services/scoring.service";
import { ministryScoringService } from "../../services/ministry-scoring.service";
import StateRankingTable from "./StateRankingTable";
import MinistryRankingTable from "./MinistryRankingTable";
import Filters from "./Filters";
import SearchBar from "./SearchBar";
// import InfoCards from "./InfoCards";
import BenchmarkingAnalysis from "./BenchmarkingAnalysis";
import ExportButton from "./ExportButton";
import CategoryCountCards from "./CategoryCountCards";
import TopPerformers from "./TopPerformers";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * Main Ranking & Scoring Page
 * - Loads data from real API only
 * - Shows no data message when API data is not available
 * - Handles filter, search, pagination, export
 * - Renders info cards, category legend, table, benchmarking, methodology
 */
const RankingScoringPage = () => {
  const { user } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("state");
  
  // State for filters, search, pagination (State/UT)
  const [search, setSearch] = useState("");
  // const [region, setRegion] = useState("All Region");
  const [category, setCategory] = useState("Overall");
  const [page, setPage] = useState(1);
  const itemsPerPage = 7;

  // State for API data (State/UT)
  const [apiStates, setApiStates] = useState([]);
  const [apiStatistics, setApiStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(false);

  // Ministry state for filters, search, pagination
  const [ministrySearch, setMinistrySearch] = useState("");
  const [ministryCategory, setMinistryCategory] = useState("Overall");
  const [ministryPage, setMinistryPage] = useState(1);

  // Ministry API data (placeholder - will be replaced with real API later)
  const [apiMinistries, setApiMinistries] = useState([]);
  const [ministryStatistics, setMinistryStatistics] = useState(null);
  const [ministryLoading, setMinistryLoading] = useState(false);
  const [ministryError, setMinistryError] = useState(null);
  const [ministryHasData, setMinistryHasData] = useState(false);

  // Static data for UI elements (not ranking data)
  // Commented out - replaced with TopPerformers component
  // const infoCards = [
  //   {
  //     label: "Total States/UTs",
  //     value: apiStates.length > 0 ? apiStates.length.toString() : "0",
  //     sub: "With ranking data",
  //     icon: "trophy",
  //   },
  //   {
  //     label: "Average Score",
  //     value: apiStatistics?.averageScore ? apiStatistics.averageScore.toFixed(1) : "N/A",
  //     sub: "Across all states",
  //     icon: "score",
  //   },
  //   {
  //     label: "Highest Score",
  //     value: apiStatistics?.highestScore ? apiStatistics.highestScore.toString() : "N/A",
  //     sub: "Top performing state",
  //     icon: "category",
  //   },
  // ];

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

  // Ministry categories (same structure as state categories)
  const ministryCategories = [
    {
      name: "Leaders",
      range: ">600",
      color: "#E6F0FF",
      description: "Top performing ministries",
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
    description: "The NIE-I (National Infrastructure Enablement Index) evaluates states based on four key pillars of infrastructure development.",
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
    // Only load state data when state tab is active
    if (activeTab !== "state") {
      return;
    }

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

  // Load data from API on component mount and when tab changes
  useEffect(() => {
    if (user && activeTab === "state") {
      loadScoringData();
    }
  }, [user, activeTab]);

  // Function to load ministry scoring data
  const loadMinistryScoringData = async () => {
    // Only load ministry data when ministry tab is active
    if (activeTab !== "ministry") {
      return;
    }

    try {
      setMinistryLoading(true);
      setMinistryError(null);
      setMinistryHasData(false);

      console.log("🔍 Ranking Page - Loading ministry data for user role:", user?.role);

      // Load rankings and statistics in parallel
      const [rankingsData, statisticsData] = await Promise.all([
        ministryScoringService.getRankings(),
        ministryScoringService.getStatistics()
      ]);

      console.log("🔍 Ranking Page - Received ministry rankings data:", rankingsData);
      console.log("🔍 Ranking Page - Received ministry statistics data:", statisticsData);

      // Check if we have valid data
      if (rankingsData && rankingsData.length > 0) {
        // Transform API data to match expected format using ministry scoring service
        const userMinistry = user?.ministry || user?.ministryName || user?.ministryId;
        const transformedMinistries = ministryScoringService.transformRankingData(rankingsData, userMinistry);
        console.log("🔍 Ranking Page - Transformed ministries:", transformedMinistries);
        
        setApiMinistries(transformedMinistries);
        setMinistryStatistics(statisticsData);
        setMinistryHasData(true);
      } else {
        console.log("🔍 Ranking Page - No ministry ranking data available");
        setApiMinistries([]);
        setMinistryStatistics(null);
        setMinistryHasData(false);
      }
    } catch (err) {
      console.error("Error loading ministry scoring data:", err);
      setMinistryError(err.message);
      setApiMinistries([]);
      setMinistryStatistics(null);
      setMinistryHasData(false);
    } finally {
      setMinistryLoading(false);
    }
  };

  // Load ministry data from API on component mount and when tab changes
  useEffect(() => {
    if (user && activeTab === "ministry") {
      loadMinistryScoringData();
    }
  }, [user, activeTab]);

  // Listen for score update events (when MOSPI Approver approves a submission)
  useEffect(() => {
    const handleScoreUpdate = async (event) => {
      console.log("🔄 Ranking Page - Score update event received:", event.detail);
      // Wait a moment for backend to finish calculating and saving the score
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Refresh the ranking data when a new score is calculated
      if (user) {
        if (activeTab === "state") {
          console.log("🔄 Ranking Page - Refreshing state ranking data after score update...");
          await loadScoringData();
        } else if (activeTab === "ministry") {
          console.log("🔄 Ranking Page - Refreshing ministry ranking data after score update...");
          await loadMinistryScoringData();
        }
      }
    };

    window.addEventListener('niri-score-updated', handleScoreUpdate);

    return () => {
      window.removeEventListener('niri-score-updated', handleScoreUpdate);
    };
  }, [user, activeTab]);


  // Use API data only
  const currentStates = apiStates;

  // Unique region list for filter dropdown
  // const regionOptions = useMemo(() => {
  //   const allRegions = currentStates.map((s) => s.region).filter(Boolean);
  //   return ["All Region", ...Array.from(new Set(allRegions))];
  // }, [currentStates]);

  // Filtering and searching logic
  const filteredStates = useMemo(() => {
    let filtered = [...currentStates];
    // if (region !== "All Region") {
    //   filtered = filtered.filter((s) => s.region === region);
    // }
    if (category !== "Overall") {
      filtered = filtered.filter((s) => s.category === category);
    }
    if (search.trim()) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(search.trim().toLowerCase()),
      );
    }
    return filtered;
  }, [currentStates, 
    // region, 
    category, search]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStates.length / itemsPerPage);
  const paginatedStates = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredStates.slice(start, start + itemsPerPage);
  }, [filteredStates, page, itemsPerPage]);

  // Handle filter/search/pagination changes
  // const handleRegionChange = (val) => {
  //   setRegion(val);
  //   setPage(1);
  // };
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

  // Ministry filtering and searching logic
  const filteredMinistries = useMemo(() => {
    let filtered = [...apiMinistries];
    if (ministryCategory !== "Overall") {
      filtered = filtered.filter((m) => m.category === ministryCategory);
    }
    if (ministrySearch.trim()) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(ministrySearch.trim().toLowerCase()),
      );
    }
    return filtered;
  }, [apiMinistries, ministryCategory, ministrySearch]);

  // Ministry pagination logic
  const ministryTotalPages = Math.ceil(filteredMinistries.length / itemsPerPage);
  const paginatedMinistries = useMemo(() => {
    const start = (ministryPage - 1) * itemsPerPage;
    return filteredMinistries.slice(start, start + itemsPerPage);
  }, [filteredMinistries, ministryPage, itemsPerPage]);

  // Handle Ministry filter/search/pagination changes
  const handleMinistryCategoryChange = (val) => {
    setMinistryCategory(val);
    setMinistryPage(1);
  };
  const handleMinistrySearch = (val) => {
    setMinistrySearch(val);
    setMinistryPage(1);
  };
  const handleMinistryPageChange = (val) => setMinistryPage(val);

  // Ministry export handler
  const handleMinistryExport = () => {
    // Export all filtered ministries, not just current page
    window.dispatchEvent(
      new CustomEvent("export-ministries-table", { detail: filteredMinistries }),
    );
  };

  // Render State tab content
  const renderStateTabContent = () => {
    // Show loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading scoring data...</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
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
      );
    }

    // Show no data state
    if (!loading && !hasData) {
      return (
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
      );
    }

    // Show data content
    return (
      <>
        {/* Info Cards - Commented out, replaced with TopPerformers */}
        {/* <InfoCards cards={infoCards} /> */}

        {/* Top 3 Performers - NEW */}
        <TopPerformers states={apiStates} />

        {/* Category Count Cards - Shows count of states in each category */}
        <CategoryCountCards 
          states={apiStates} 
          categories={categories}
          onCategoryClick={handleCategoryChange}
          selectedCategory={category}
        />

        {/* Visual Separator */}
        <div style={{ 
          height: 1, 
          background: "linear-gradient(to right, transparent, #E0E0E0, transparent)",
          margin: "32px 0 24px 0"
        }} />

        {/* Table Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 20,
        }}>
          <h2 style={{ 
            fontSize: 22, 
            fontWeight: 600, 
            color: "#1A1A1A",
            margin: 0,
          }}>
            State Rankings
          </h2>
          <div style={{ 
            fontSize: 14, 
            color: "#666",
            fontWeight: 500,
          }}>
            Showing <span style={{ fontWeight: 600, color: "#2B5CB8" }}>{filteredStates.length}</span> {filteredStates.length === 1 ? 'state' : 'states'}
          </div>
        </div>

        {/* Table Controls */}
        <div
          className="bg-white rounded-lg shadow-sm border p-6"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid #E5E7EB",
            padding: "20px 24px",
            position: "relative",
            zIndex: 2,
          }}
        >
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search States"
          />
          <Filters
            // region={region}
            // regionOptions={regionOptions}
            category={category}
            categoryOptions={["Overall", ...categories.map((c) => c.name)]}
            // onRegionChange={handleRegionChange}
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

        {/* Visual Separator */}
        <div style={{ 
          height: 1, 
          background: "linear-gradient(to right, transparent, #E0E0E0, transparent)",
          margin: "48px 0 32px 0"
        }} />

        {/* Methodology Section */}
        <div
          style={{
            background: "linear-gradient(135deg, #F7F9FB 0%, #FFFFFF 100%)",
            borderRadius: 16,
            padding: 32,
            marginTop: 32,
            border: "1px solid #E5E7EB",
            borderLeft: "4px solid #2B5CB8",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div style={{ 
            marginBottom: 20 
          }}>
            <h2 style={{ 
              fontWeight: 700, 
              fontSize: 22, 
              color: "#1A1A1A",
              margin: 0,
            }}>
              About NIE-I Methodology
            </h2>
          </div>
          <div style={{ 
            fontSize: 15, 
            color: "#3A3A3A", 
            marginBottom: 20,
            lineHeight: 1.6,
          }}>
            {methodology.description}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 20,
          }}>
            {methodology.pillars.map((pillar) => (
              <div
                key={pillar.name}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: "16px 20px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div style={{ 
                  fontWeight: 600, 
                  color: "#2B5CB8",
                  fontSize: 15,
                  marginBottom: 6,
                }}>
                  {pillar.name}
                </div>
                <div style={{ 
                  fontSize: 13, 
                  color: "#666",
                  marginBottom: 8,
                  fontWeight: 500,
                }}>
                  {pillar.points} points
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: "#444",
                  lineHeight: 1.5,
                }}>
                  {pillar.details}
                </div>
              </div>
            ))}
          </div>
          <div style={{ 
            paddingTop: 20,
            borderTop: "1px solid #E5E7EB",
          }}>
            <div style={{ 
              fontSize: 14, 
              color: "#666", 
              marginBottom: 8,
              fontWeight: 500,
            }}>
              {methodology.note}
            </div>
            <div style={{ 
              fontSize: 13, 
              color: "#888",
              fontStyle: "italic",
            }}>
              {methodology.period}
            </div>
          </div>
        </div>
      </>
    );
  };

  // Render Ministry tab content
  const renderMinistryTabContent = () => {
    // Show loading state
    if (ministryLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ministry scoring data...</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (ministryError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600 mb-4">{ministryError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    // Show no data state
    if (!ministryLoading && !ministryHasData) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Ministry Ranking & Scoring Data Available</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Currently, there is no ministry ranking and scoring data available. The data will be displayed here once it becomes available from the API.
          </p>
          <div className="text-sm text-gray-500">
            <p>This could be because:</p>
            <ul className="mt-2 space-y-1">
              <li>• No ministries have submitted their data yet</li>
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
      );
    }

    // Show data content
    return (
      <>
        {/* Top 3 Performers */}
        <TopPerformers states={apiMinistries} />

        {/* Category Count Cards - Shows count of ministries in each category */}
        <CategoryCountCards 
          states={apiMinistries} 
          categories={ministryCategories}
          onCategoryClick={handleMinistryCategoryChange}
          selectedCategory={ministryCategory}
        />

        {/* Visual Separator */}
        <div style={{ 
          height: 1, 
          background: "linear-gradient(to right, transparent, #E0E0E0, transparent)",
          margin: "32px 0 24px 0"
        }} />

        {/* Table Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 20,
        }}>
          <h2 style={{ 
            fontSize: 22, 
            fontWeight: 600, 
            color: "#1A1A1A",
            margin: 0,
          }}>
            Ministry Rankings
          </h2>
          <div style={{ 
            fontSize: 14, 
            color: "#666",
            fontWeight: 500,
          }}>
            Showing <span style={{ fontWeight: 600, color: "#2B5CB8" }}>{filteredMinistries.length}</span> {filteredMinistries.length === 1 ? 'ministry' : 'ministries'}
          </div>
        </div>

        {/* Table Controls */}
        <div
          className="bg-white rounded-lg shadow-sm border p-6"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid #E5E7EB",
            padding: "20px 24px",
            position: "relative",
            zIndex: 2,
          }}
        >
          <SearchBar
            value={ministrySearch}
            onChange={handleMinistrySearch}
            placeholder="Search Ministries"
          />
          <Filters
            category={ministryCategory}
            categoryOptions={["Overall", ...ministryCategories.map((c) => c.name)]}
            onCategoryChange={handleMinistryCategoryChange}
          />
          <ExportButton onClick={handleMinistryExport} />
        </div>

        {/* Ministry Ranking Table */}
        <MinistryRankingTable
          ministries={paginatedMinistries}
          page={ministryPage}
          totalPages={ministryTotalPages}
          totalItems={filteredMinistries.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handleMinistryPageChange}
        />

        {/* Visual Separator */}
        <div style={{ 
          height: 1, 
          background: "linear-gradient(to right, transparent, #E0E0E0, transparent)",
          margin: "48px 0 32px 0"
        }} />

        {/* Methodology Section */}
        <div
          style={{
            background: "linear-gradient(135deg, #F7F9FB 0%, #FFFFFF 100%)",
            borderRadius: 16,
            padding: 32,
            marginTop: 32,
            border: "1px solid #E5E7EB",
            borderLeft: "4px solid #2B5CB8",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div style={{ 
            marginBottom: 20 
          }}>
            <h2 style={{ 
              fontWeight: 700, 
              fontSize: 22, 
              color: "#1A1A1A",
              margin: 0,
            }}>
              About NIE-I Methodology
            </h2>
          </div>
          <div style={{ 
            fontSize: 15, 
            color: "#3A3A3A", 
            marginBottom: 20,
            lineHeight: 1.6,
          }}>
            The NIE-I (National Infrastructure Enablement Index) evaluates ministries based on four key pillars of infrastructure development.
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 20,
          }}>
            {methodology.pillars.map((pillar) => (
              <div
                key={pillar.name}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: "16px 20px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div style={{ 
                  fontWeight: 600, 
                  color: "#2B5CB8",
                  fontSize: 15,
                  marginBottom: 6,
                }}>
                  {pillar.name}
                </div>
                <div style={{ 
                  fontSize: 13, 
                  color: "#666",
                  marginBottom: 8,
                  fontWeight: 500,
                }}>
                  {pillar.points} points
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: "#444",
                  lineHeight: 1.5,
                }}>
                  {pillar.details}
                </div>
              </div>
            ))}
          </div>
          <div style={{ 
            paddingTop: 20,
            borderTop: "1px solid #E5E7EB",
          }}>
            <div style={{ 
              fontSize: 14, 
              color: "#666", 
              marginBottom: 8,
              fontWeight: 500,
            }}>
              {methodology.note}
            </div>
            <div style={{ 
              fontSize: 13, 
              color: "#888",
              fontStyle: "italic",
            }}>
              Data is updated quarterly based on the latest available information from ministries.
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="ranking-scoring-page " style={{ padding: "32px 0" }}>
      {/* Tabs for State/UT and Ministry */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => {
          setActiveTab(value);
          // Reset filters when switching tabs
          setSearch("");
          setCategory("Overall");
          setPage(1);
          setMinistrySearch("");
          setMinistryCategory("Overall");
          setMinistryPage(1);
        }} 
        className="w-full mb-6"
      >
        <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-gray-100 p-1 gap-1">
          <TabsTrigger 
            value="state" 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            State/UT
          </TabsTrigger>
          <TabsTrigger 
            value="ministry"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Ministry
          </TabsTrigger>
        </TabsList>

        {/* State/UT Tab Content */}
        <TabsContent value="state" className="mt-6">
          {renderStateTabContent()}
        </TabsContent>

        {/* Ministry Tab Content */}
        <TabsContent value="ministry" className="mt-6">
          {renderMinistryTabContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RankingScoringPage;