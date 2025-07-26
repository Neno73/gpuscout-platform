'use client';

import { PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PortfolioCreateModal } from '@/components/portfolio/PortfolioCreateModal';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { PortfolioListSkeleton } from '@/components/portfolio/PortfolioSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePortfolios } from '@/hooks/usePortfolios';
import { Portfolio } from '@/lib/api';

export default function PortfolioDashboardPage() {
  const { 
    portfolios, 
    loading, 
    error, 
    refetch, 
    addPortfolio 
  } = usePortfolios();

  const handleNewPortfolio = (newPortfolio: Portfolio) => {
    addPortfolio(newPortfolio);
  };

  const handleViewDetails = (portfolio: Portfolio) => {
    // TODO: Navigate to portfolio details page
    console.log('Viewing portfolio details:', portfolio);
  };

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Portfolios</h1>
            <p className="text-muted-foreground mt-1">
              Manage your GPU collections and track performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <PortfolioCreateModal onSuccess={handleNewPortfolio}>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Portfolio
              </Button>
            </PortfolioCreateModal>
          </div>
        </div>

        {loading && portfolios.length === 0 ? (
          <PortfolioListSkeleton />
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load portfolios</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : portfolios.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="max-w-md mx-auto">
                <PlusCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No portfolios yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first portfolio to start tracking your GPU collections
                </p>
                <PortfolioCreateModal onSuccess={handleNewPortfolio}>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Portfolio
                  </Button>
                </PortfolioCreateModal>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {portfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}