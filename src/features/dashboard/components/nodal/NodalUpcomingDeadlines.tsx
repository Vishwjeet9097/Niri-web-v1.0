import React from "react";

interface Deadline {
  title: string;
  daysLeft: number;
}

interface NodalUpcomingDeadlinesProps {
  deadlines: Deadline[];
}

export default function NodalUpcomingDeadlines({ deadlines }: NodalUpcomingDeadlinesProps) {
  return (
    <div className="bg-[#162B5B] rounded-xl p-6 shadow-md min-h-[180px] flex flex-col">
      <h2 className="text-white text-lg font-semibold mb-4">
        Upcoming Deadlines
      </h2>
      <p className="text-blue-100 text-xs mb-4">
        Stay on track with your submission schedule
      </p>
      <div className="flex-1 flex flex-col gap-3">
        {deadlines.map((d, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-white/10 rounded-lg px-4 py-3"
          >
            <div>
              <div className="font-medium text-white text-sm">{d.title}</div>
              <div className="text-xs text-blue-100">
                {d.daysLeft} days left
              </div>
            </div>
            <div className="text-yellow-200 font-semibold">{d.daysLeft}d</div>
          </div>
        ))}
      </div>
    </div>
  );
}
