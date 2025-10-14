import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string | ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export const SectionCard = ({ title, subtitle, children, className }: SectionCardProps) => {
  return (
    <Card className={cn('mb-6', className)}>
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-base font-semibold bg-[#E9EDFB] px-6 py-2">{title}</CardTitle>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground font-normal px-6">{subtitle}</p>}
      </CardHeader>
      <CardContent className="">{children}</CardContent>
    </Card>
  );
};
