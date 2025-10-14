import { Badge } from "@/components/ui/badge";

interface ProgressHeaderProps {
  title: string;
  description: string;
  points: number;
  completed: number;
  total: number;
  progress: number;
}

export const ProgressHeader = ({
  title,
  description,
  points,
  completed,
  total,
  progress,
}: ProgressHeaderProps) => {
  return (
    <div className="flex flex-col items-center gap-8 self-stretch rounded-lg border border-[#DDD] bg-white p-5 mb-6">
      <div className="flex items-start justify-between w-full">
        <div>
          <h2 className="text-[18px] font-semibold text-[#212121]">
            {title} | {points} Points
          </h2>
          <p className="text-sm text-[#727272] mt-1">{description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-[#212121]">
            {completed}/{total} completed
          </p>
          <p className="text-xs text-[#727272]">{progress}% Progress</p>
        </div>
      </div>
    </div>
  );
};
