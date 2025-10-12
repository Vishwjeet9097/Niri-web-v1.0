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
        <CardTitle className="text-base font-semibold text-primary">{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
};
