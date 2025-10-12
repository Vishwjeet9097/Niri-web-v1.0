import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { dummyDataService } from '@/services/dummyData.service';

interface TestDataIndicatorProps {
  className?: string;
}

export const TestDataIndicator: React.FC<TestDataIndicatorProps> = ({ 
  className = "fixed top-4 right-4 z-50" 
}) => {
  if (!dummyDataService.isDummyDataEnabled()) {
    return null;
  }

  return (
    <Badge 
      variant="destructive" 
      className={`${className} flex items-center gap-2 shadow-lg`}
    >
      <AlertTriangle className="w-3 h-3" />
      <span className="text-xs font-medium">TEST DATA</span>
    </Badge>
  );
};

export default TestDataIndicator;
