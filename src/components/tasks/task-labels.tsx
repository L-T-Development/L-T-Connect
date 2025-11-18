'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskLabelsProps {
  labels: string[];
  onChange: (labels: string[]) => void;
  readonly?: boolean;
}

const PRESET_COLORS = [
  { name: 'red', bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-950', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700' },
  { name: 'gray', bg: 'bg-gray-100 dark:bg-gray-950', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-700' },
];

function getLabelColor(label: string) {
  // Extract color prefix if exists (e.g., "red:bug" -> "red")
  const colorMatch = label.match(/^(red|orange|yellow|green|blue|purple|pink|gray):/);
  if (colorMatch) {
    const colorName = colorMatch[1];
    return PRESET_COLORS.find(c => c.name === colorName) || PRESET_COLORS[7]; // Default to gray
  }
  // Hash-based color for labels without prefix
  const hash = label.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  return PRESET_COLORS[hash % PRESET_COLORS.length];
}

function getLabelText(label: string) {
  // Remove color prefix if exists
  return label.replace(/^(red|orange|yellow|green|blue|purple|pink|gray):/, '');
}

export function TaskLabels({ labels, onChange, readonly = false }: TaskLabelsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[4].name); // Default to blue

  const handleAddLabel = () => {
    if (!newLabel.trim()) return;
    
    const labelWithColor = `${selectedColor}:${newLabel.trim()}`;
    if (!labels.includes(labelWithColor)) {
      onChange([...labels, labelWithColor]);
    }
    setNewLabel('');
    setIsOpen(false);
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    onChange(labels.filter(l => l !== labelToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLabel();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {labels.map((label) => {
          const color = getLabelColor(label);
          const text = getLabelText(label);
          
          return (
            <Badge
              key={label}
              variant="outline"
              className={cn(
                'gap-1 pr-1',
                color.bg,
                color.text,
                color.border
              )}
            >
              <Tag className="h-3 w-3" />
              <span>{text}</span>
              {!readonly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-transparent"
                  onClick={() => handleRemoveLabel(label)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          );
        })}

        {!readonly && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                <Plus className="h-3 w-3" />
                Add Label
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Label Name</label>
                  <Input
                    placeholder="e.g., bug, feature, urgent"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="grid grid-cols-4 gap-2 mt-1.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        className={cn(
                          'h-8 rounded border-2 transition-all',
                          color.bg,
                          selectedColor === color.name
                            ? 'border-primary ring-2 ring-primary ring-offset-2'
                            : 'border-transparent hover:border-muted-foreground'
                        )}
                        onClick={() => setSelectedColor(color.name)}
                      >
                        <span className="sr-only">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddLabel} disabled={!newLabel.trim()}>
                    Add Label
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {labels.length === 0 && readonly && (
        <p className="text-sm text-muted-foreground">No labels</p>
      )}
    </div>
  );
}

// Export helper functions for use elsewhere
export { getLabelColor, getLabelText };
