import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import type { KPICard as KPICardType } from "@/types";

interface KPICardProps {
  data: KPICardType;
}

export function KPICard({ data }: KPICardProps) {
  const Icon = ((Icons as any)[data.icon] as LucideIcon) || Icons.FileText;

  const TrendIcon =
    data.trend === "up" ? ArrowUp : data.trend === "down" ? ArrowDown : Minus;
  const trendColor =
    data.trend === "up"
      ? "text-success"
      : data.trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {data.title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{data.value}</div>
        {data.change !== undefined && (
          <p className={`text-xs flex items-center gap-1 mt-1 ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(data.change)}% from last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
