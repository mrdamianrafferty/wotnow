import React, { useState, useEffect, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/grow/api';

interface Plant {
  id: string;
  name: string;
  type: string;
  planted: Date;
  location: string;
  health: 'excellent' | 'good' | 'fair' | 'poor';
  lastWatered?: Date;
  notes?: string;
}

const HEALTH_OPTIONS: Array<{ value: 'excellent' | 'good' | 'fair' | 'poor'; label: string }> = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Needs attention' },
];

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface EditPlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant | null;
  onPlantUpdated: (plant: Plant) => void;
}

export function EditPlantDialog({ open, onOpenChange, plant, onPlantUpdated }: EditPlantDialogProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [plantedDate, setPlantedDate] = useState('');
  const [lastWateredDate, setLastWateredDate] = useState('');
  const [health, setHealth] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when plant changes or dialog opens
  useEffect(() => {
    if (plant && open) {
      setName(plant.name);
      setLocation(plant.location);
      setPlantedDate(formatDateInput(plant.planted));
      setLastWateredDate(plant.lastWatered ? formatDateInput(plant.lastWatered) : '');
      setHealth(plant.health);
      setNotes(plant.notes || '');
    }
  }, [plant, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!plant) return;

    const updates = {
      name: name.trim(),
      location: location.trim() || null,
      health,
      planted: plantedDate ? new Date(`${plantedDate}T00:00:00`).toISOString() : null,
      lastWatered: lastWateredDate ? new Date(`${lastWateredDate}T00:00:00`).toISOString() : null,
      notes: notes.trim() || null,
    };

    setIsSaving(true);

    try {
      await api.updatePlant(plant.id, updates);
      
      // Update local plant object
      const updatedPlant: Plant = {
        ...plant,
        name: updates.name,
        location: updates.location || 'Garden',
        health: updates.health,
        planted: updates.planted ? new Date(updates.planted) : plant.planted,
        lastWatered: updates.lastWatered ? new Date(updates.lastWatered) : undefined,
        notes: updates.notes || undefined,
      };

      onPlantUpdated(updatedPlant);
      toast.success('Plant updated', {
        description: `${updates.name} has been updated.`,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Could not update plant', {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset form state when closing
      setIsSaving(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Plant
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-plant-name">Plant name</Label>
              <Input
                id="edit-plant-name"
                value={name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                placeholder="e.g. Cherry Tomato"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-plant-location">Location</Label>
              <Input
                id="edit-plant-location"
                value={location}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setLocation(event.target.value)}
                placeholder="e.g. Raised Bed 1"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-plant-date">Planted</Label>
                <Input
                  id="edit-plant-date"
                  type="date"
                  value={plantedDate}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setPlantedDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-plant-watered">Last watered</Label>
                <Input
                  id="edit-plant-watered"
                  type="date"
                  value={lastWateredDate}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setLastWateredDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Health</Label>
              <Select value={health} onValueChange={(value) => setHealth(value as typeof health)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select health" />
                </SelectTrigger>
                <SelectContent>
                  {HEALTH_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-plant-notes">Notes</Label>
              <Textarea
                id="edit-plant-notes"
                value={notes}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
                rows={3}
                placeholder="Watering schedule, variety details, reminders…"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
