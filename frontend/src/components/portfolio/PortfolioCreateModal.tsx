'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient, Portfolio } from '@/lib/api';

interface PortfolioCreateModalProps {
  onSuccess: (newPortfolio: Portfolio) => void;
  children: React.ReactNode;
}

export function PortfolioCreateModal({ onSuccess, children }: PortfolioCreateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name) {
      setError('Portfolio name is required.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await apiClient.post<Portfolio>('/portfolios', { name, description });

    setIsLoading(false);
    if (result.success && result.data) {
      onSuccess(result.data);
      setIsOpen(false);
      setName('');
      setDescription('');
    } else {
      setError(result.error || 'Failed to create portfolio.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Portfolio</DialogTitle>
          <DialogDescription>
            Give your new portfolio a name to start tracking your GPUs.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Main AI Rig" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" placeholder="Optional description" />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Portfolio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}