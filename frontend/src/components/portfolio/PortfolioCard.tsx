import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Calendar, Cpu } from 'lucide-react';
import { Portfolio } from '@/lib/api';

interface PortfolioCardProps {
  portfolio: Portfolio;
  onEdit?: (portfolio: Portfolio) => void;
  onDelete?: (portfolioId: string) => void;
  onViewDetails?: (portfolio: Portfolio) => void;
}

export function PortfolioCard({ 
  portfolio, 
  onEdit, 
  onDelete, 
  onViewDetails 
}: PortfolioCardProps) {
  const createdDate = new Date(portfolio.created_at).toLocaleDateString();
  const gpuCount = portfolio.gpu_count || 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              {portfolio.name}
            </CardTitle>
            {portfolio.description && (
              <CardDescription className="text-sm">
                {portfolio.description}
              </CardDescription>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              // Add dropdown menu here later
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Cpu className="h-4 w-4" />
              <span>{gpuCount} GPU{gpuCount !== 1 ? 's' : ''}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Created {createdDate}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(portfolio);
              }}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}