import { Outlet } from "react-router-dom";

export const SubmissionLayout = () => {
  // Debug: log when SubmissionLayout renders
  console.log("SubmissionLayout rendered");

  return (
    <div className="">
      <Outlet />
    </div>
  );
};
