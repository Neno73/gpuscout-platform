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
import { useMarketplaceOffers } from '@/hooks/useMarketplaceOffers';

interface AddGpuModalProps {
  children: ReactNode;
  portfolioId: string;
  onSuccess?: (newInstances: GpuInstance[]) => void;
}

export function AddGpuModal({ children, portfolioId, onSuccess }: AddGpuModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedOffers, setSelectedOffers] = useState<number[]>([]);
  const [customName, setCustomName] = useState('');
  
  const { offers, loading: offersLoading, error: offersError, getBestOffers } = useMarketplaceOffers();
  const { addGpuInstances, loading: addLoading, error: addError } = useGpuInstances();

  const bestOffers = getBestOffers(12);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedOffers.length === 0) {
      return;
    }

    const result = await addGpuInstances(portfolioId, {
      offerIds: selectedOffers,
      customName: customName || undefined
    });

    if (result) {
      onSuccess?.(result);
      setOpen(false);
      // Reset form
      setSelectedOffers([]);
      setCustomName('');
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
            Select real GPU instances from the marketplace to add to your portfolio. All offers are verified and available for rent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Marketplace Offers Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select GPU Offers (Choose multiple)</Label>
            
            {offersLoading ? (
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
            ) : offersError ? (
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600">Failed to load marketplace offers</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                {bestOffers.map((offer) => (
                  <Card 
                    key={offer.offer_id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedOffers.includes(offer.offer_id) ? 'ring-2 ring-primary bg-accent' : ''
                    }`}
                    onClick={() => {
                      setSelectedOffers(prev => 
                        prev.includes(offer.offer_id) 
                          ? prev.filter(id => id !== offer.offer_id)
                          : [...prev, offer.offer_id]
                      );
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{offer.gpu_name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            ID: {offer.offer_id}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{formatPrice(offer.price_base_per_hour)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            <span>{offer.dlperf.toFixed(1)} DLPERF</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            <span>{offer.location}</span>
                          </div>
                          <div className="text-xs text-green-600">
                            {(offer.reliability_score * 100).toFixed(0)}% reliable
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selected Offers Summary */}
          {selectedOffers.length > 0 && (
            <Card className="bg-accent/50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Selected Offers ({selectedOffers.length})
                </h4>
                <div className="space-y-2">
                  {selectedOffers.map(offerId => {
                    const offer = bestOffers.find(o => o.offer_id === offerId);
                    if (!offer) return null;
                    return (
                      <div key={offerId} className="flex justify-between items-center text-sm">
                        <span>{offer.gpu_name} - {offer.location}</span>
                        <span className="font-medium">{formatPrice(offer.price_base_per_hour)}</span>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>Total Cost:</span>
                      <span>
                        {formatPrice(
                          selectedOffers.reduce((sum, offerId) => {
                            const offer = bestOffers.find(o => o.offer_id === offerId);
                            return sum + (offer?.price_base_per_hour || 0);
                          }, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Name */}
          <div className="space-y-2">
            <Label htmlFor="customName">Custom Name (Optional)</Label>
            <Input
              id="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Production Farm, AI Training Cluster"
            />
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
              disabled={selectedOffers.length === 0 || addLoading}
            >
              {addLoading ? 'Adding...' : `Add ${selectedOffers.length} GPU Instance${selectedOffers.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}