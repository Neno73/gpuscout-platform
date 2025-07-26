'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, RefreshCw, AlertCircle, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AddGpuModal } from '@/components/portfolio/AddGpuModal';
import { GpuInstanceCard } from '@/components/portfolio/GpuInstanceCard';
import { apiClient, Portfolio } from '@/lib/api';
import { useGpuData } from '@/hooks/useGpuData';
import { useGpuInstances, GpuInstance } from '@/hooks/useGpuInstances';

interface PortfolioWithGpus extends Portfolio {
  gpus: GpuInstance[];
}

interface PortfolioDetailClientProps {
  params: { id: string };
}

export default function PortfolioDetailClient({ params }: PortfolioDetailClientProps) {
  const [portfolio, setPortfolio] = useState<PortfolioWithGpus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { gpus: gpuData, getGpuByName } = useGpuData();
  const { deleteGpuInstance, loading: deleteLoading } = useGpuInstances();

  const fetchPortfolio = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.get<PortfolioWithGpus>(`/portfolios/${params.id}`);
      if (result.success && result.data) {
        setPortfolio(result.data);
      } else {
        setError(result.error || 'Failed to load portfolio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [params.id]);

  const handleAddGpus = (newInstances: GpuInstance[]) => {
    if (portfolio) {
      setPortfolio({
        ...portfolio,
        gpus: [...newInstances, ...portfolio.gpus]
      });
    }
  };

  const handleDeleteGpu = async (instance: GpuInstance) => {
    if (!portfolio) return;
    
    const success = await deleteGpuInstance(portfolio.id, instance.id);
    if (success) {
      setPortfolio({
        ...portfolio,
        gpus: portfolio.gpus.filter(gpu => gpu.id !== instance.id)
      });
    }
  };

  const handleEditGpu = (instance: GpuInstance) => {
    // TODO: Implement edit modal
    console.log('Edit GPU instance:', instance);
  };

  const totalValue = portfolio?.gpus.reduce((sum, gpu) => {
    const gpuInfo = getGpuByName(gpu.gpu_model);
    return sum + (gpuInfo?.stats.all.all[0]?.price_median || 0);
  }, 0) || 0;

  const gpuModelCounts = portfolio?.gpus.reduce((counts, gpu) => {
    counts[gpu.gpu_model] = (counts[gpu.gpu_model] || 0) + 1;
    return counts;
  }, {} as Record<string, number>) || {};

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Button variant="outline" className="mb-6" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Portfolios
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load portfolio</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchPortfolio}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{portfolio.name}</h1>
            {portfolio.description && (
              <p className="text-muted-foreground mt-1">{portfolio.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchPortfolio}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <AddGpuModal portfolioId={portfolio.id} onSuccess={handleAddGpus}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add GPU
              </Button>
            </AddGpuModal>
          </div>
        </div>

        {/* Portfolio Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total GPUs</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{portfolio.gpus.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">GPU Models</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{Object.keys(gpuModelCounts).length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Est. Hourly Cost</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">${totalValue.toFixed(2)}/hr</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant="secondary">Active</Badge>
            </CardContent>
          </Card>
        </div>

        {/* GPU Model Summary */}
        {Object.keys(gpuModelCounts).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                GPU Models
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(gpuModelCounts).map(([model, count]) => (
                  <Badge key={model} variant="outline" className="text-sm">
                    {count}x {model}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* GPU Instances */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">GPU Instances</h2>
          
          {portfolio.gpus.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="max-w-md mx-auto">
                  <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No GPUs added yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add GPU models to track their performance and costs in real-time
                  </p>
                  <AddGpuModal portfolioId={portfolio.id} onSuccess={handleAddGpus}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First GPU
                    </Button>
                  </AddGpuModal>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {portfolio.gpus.map((gpu) => (
                <GpuInstanceCard
                  key={gpu.id}
                  instance={gpu}
                  gpuData={getGpuByName(gpu.gpu_model)}
                  onEdit={handleEditGpu}
                  onDelete={handleDeleteGpu}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}