'use client';

import { useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Cpu, DollarSign, HardDrive, Zap, AlertCircle } from 'lucide-react';
import { useGpuData } from '@/hooks/useGpuData';
import { useGpuInstances, GpuInstance } from '@/hooks/useGpuInstances';

interface AddGpuModalProps {
  children: ReactNode;
  portfolioId: string;
  onSuccess?: (newInstances: GpuInstance[]) => void;
}

export function AddGpuModal({ children, portfolioId, onSuccess }: AddGpuModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedGpu, setSelectedGpu] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [customNamePrefix, setCustomNamePrefix] = useState('');
  
  const { gpus, loading: gpuLoading, error: gpuError, getPopularGpus } = useGpuData();
  const { addGpuInstances, loading: addLoading, error: addError } = useGpuInstances();

  const popularGpus = getPopularGpus(12);
  const selectedGpuData = gpus.find(gpu => gpu.name === selectedGpu);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGpu || quantity < 1) {
      return;
    }

    const result = await addGpuInstances(portfolioId, {
      gpuModel: selectedGpu,
      quantity,
      customNamePrefix: customNamePrefix || undefined
    });

    if (result) {
      onSuccess?.(result);
      setOpen(false);
      // Reset form
      setSelectedGpu('');
      setQuantity(1);
      setCustomNamePrefix('');
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}/hr`;
  const formatVram = (vram: number) => `${vram}GB VRAM`;
  const formatTflops = (tflops: number) => `${tflops.toFixed(1)} TFLOPS`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add GPU to Portfolio
          </DialogTitle>
          <DialogDescription>
            Select GPU models to track in your portfolio. Choose from popular models with real-time market data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GPU Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select GPU Model</Label>
            
            {gpuLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <Skeleton className="h-5 w-24 mb-2" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : gpuError ? (
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600">Failed to load GPU data</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                {popularGpus.map((gpu) => (
                  <Card 
                    key={gpu.name}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedGpu === gpu.name ? 'ring-2 ring-primary bg-accent' : ''
                    }`}
                    onClick={() => setSelectedGpu(gpu.name)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{gpu.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {gpu.stats.all.all[0]?.count || 0} units
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            <span>{formatVram(gpu.info.vram)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            <span>{formatTflops(gpu.info.tflops)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{formatPrice(gpu.stats.all.all[0]?.price_median || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selected GPU Details */}
          {selectedGpuData && (
            <Card className="bg-accent/50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  {selectedGpuData.name} Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">VRAM</div>
                    <div className="font-medium">{formatVram(selectedGpuData.info.vram)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Performance</div>
                    <div className="font-medium">{formatTflops(selectedGpuData.info.tflops)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Median Price</div>
                    <div className="font-medium">{formatPrice(selectedGpuData.stats.all.all[0]?.price_median || 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Available</div>
                    <div className="font-medium">{selectedGpuData.stats.all.all[0]?.count || 0} units</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quantity and Custom Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                placeholder="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customName">Custom Name Prefix (Optional)</Label>
              <Input
                id="customName"
                value={customNamePrefix}
                onChange={(e) => setCustomNamePrefix(e.target.value)}
                placeholder="e.g., Production, Dev, Node"
              />
            </div>
          </div>

          {/* Error Display */}
          {addError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{addError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={addLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedGpu || quantity < 1 || addLoading}
            >
              {addLoading ? 'Adding...' : `Add ${quantity} ${selectedGpu || 'GPU'}${quantity > 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}