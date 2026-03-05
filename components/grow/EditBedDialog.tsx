import React, { useState, useEffect } from 'react';
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
import {
  BED_COLORS,
  BED_COLOR_HEX,
  BED_TYPES,
  type BedColor,
  type BedType,
  type SerializedBed,
} from '../../lib/grow/server/beds';

interface EditBedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bed: SerializedBed | null;
  onBedUpdated: (bed: SerializedBed) => void;
}

export function EditBedDialog({ open, onOpenChange, bed, onBedUpdated }: EditBedDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<BedType>('raised_bed');
  const [color, setColor] = useState<BedColor>('terracotta');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bed && open) {
      setName(bed.name);
      setType(bed.type);
      setColor(bed.color);
      setNotes(bed.notes || '');
    }
  }, [bed, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bed) return;

    setIsSaving(true);
    try {
      const response = await api.updateBed(bed.id, {
        name: name.trim(),
        type,
        color,
        notes: notes.trim() || null,
      });
      const updated = response?.bed as SerializedBed;
      if (updated) {
        onBedUpdated(updated);
      }
      toast.success('Bed updated');
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Could not update bed', { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Bed
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="edit-bed-name">Name</Label>
            <Input
              id="edit-bed-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as BedType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(BED_TYPES) as [BedType, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {BED_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-green-600 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: BED_COLOR_HEX[c] }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-bed-notes">Notes</Label>
            <Textarea
              id="edit-bed-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Soil mix, dimensions, orientation…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()} className="bg-green-600 hover:bg-green-700">
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
