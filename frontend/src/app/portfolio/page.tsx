'use client';

import { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortfolioCreateModal } from '@/components/portfolio/PortfolioCreateModal';
import { apiClient, Portfolio } from '@/lib/api';

export default function PortfolioDashboardPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolios = async () => {
      setIsLoading(true);
      const result = await apiClient.get<Portfolio[]>('/portfolios');
      if (result.success && result.data) {
        setPortfolios(result.data);
      } else {
        setError(result.error || 'Failed to load portfolios.');
      }
      setIsLoading(false);
    };
    fetchPortfolios();
  }, []);

  const handleNewPortfolio = (newPortfolio: Portfolio) => {
    setPortfolios(prev => [newPortfolio, ...prev]);
  };

  if (isLoading) {
    return <div className="p-8">Loading portfolios...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Portfolios</h1>
        <PortfolioCreateModal onSuccess={handleNewPortfolio}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Portfolio
          </Button>
        </PortfolioCreateModal>
      </div>

      {portfolios.length === 0 ? (
        <p>You don't have any portfolios yet. Click "Create Portfolio" to get started.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Portfolio cards will be rendered here */}
        </div>
      )}
    </div>
  );
}