import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit2, Trash2, Cpu, HardDrive, Zap, DollarSign } from 'lucide-react';
import { GpuInstance } from '@/hooks/useGpuInstances';
import { GpuModel } from '@/hooks/useGpuData';

interface GpuInstanceCardProps {
  instance: GpuInstance;
  gpuData?: GpuModel;
  onEdit?: (instance: GpuInstance) => void;
  onDelete?: (instance: GpuInstance) => void;
}

export function GpuInstanceCard({ 
  instance, 
  gpuData, 
  onEdit, 
  onDelete 
}: GpuInstanceCardProps) {
  const createdDate = new Date(instance.created_at).toLocaleDateString();
  
  const formatPrice = (price: number) => `$${price.toFixed(2)}/hr`;
  const formatVram = (vram: number) => `${vram}GB`;
  const formatTflops = (tflops: number) => `${tflops.toFixed(1)}T`;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              {instance.custom_name || instance.gpu_model}
            </CardTitle>
            {instance.custom_name && (
              <p className="text-xs text-muted-foreground">{instance.gpu_model}</p>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              // Add dropdown menu here later
            }}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* GPU Specifications */}
          {gpuData && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <HardDrive className="h-3 w-3 text-muted-foreground" />
                <span>{formatVram(gpuData.info.vram)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-muted-foreground" />
                <span>{formatTflops(gpuData.info.tflops)}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span>{formatPrice(gpuData.stats.all.all[0]?.price_median || 0)}</span>
              </div>
            </div>
          )}
          
          {/* Status and Date */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
            <span className="text-xs text-muted-foreground">
              Added {createdDate}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => onEdit?.(instance)}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 h-7 text-xs text-red-600 hover:text-red-700"
              onClick={() => onDelete?.(instance)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}