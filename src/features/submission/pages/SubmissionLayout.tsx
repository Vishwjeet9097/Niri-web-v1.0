import { Outlet } from "react-router-dom";

export const SubmissionLayout = () => {
  // Debug: log when SubmissionLayout renders
  console.log("SubmissionLayout rendered");

  return (
    <div className="min-h-screen  bg-white/10 rounded-lg shadow-sm border p-6">
      <Outlet />
    </div>
  );
};
