'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { searchMedicines, type Medicine } from '@/lib/firebase/medicines';
import { cn } from '@/lib/utils';

interface MedicineAutocompleteProps {
  onSelect: (value: string) => void;
  value: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function MedicineAutocomplete({ 
  onSelect, 
  value,
  className,
  ...props 
}: MedicineAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Add click outside listener to close suggestions
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onSelect(newValue);
    setHighlightedIndex(-1);

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (newValue.trim().length >= 2) {
      // Set a new timer for the search
      debounceTimerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          console.log('Searching for:', newValue.trim());
          const results = await searchMedicines(newValue.trim());
          console.log('Search results:', results);
          setSuggestions(results);
          setIsOpen(true);
        } catch (error) {
          console.error('Error searching medicines:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300); // 300ms debounce delay
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (medicine: Medicine) => {
    onSelect(medicine.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.trim().length >= 2 && setIsOpen(true)}
        className={cn("relative", className)}
        autoComplete="off"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto"
        >
          {suggestions.map((medicine, index) => (
            <div
              key={medicine.id || index}
              className={cn(
                "px-4 py-2 cursor-pointer text-sm",
                index === highlightedIndex ? "bg-gray-100" : "hover:bg-gray-50"
              )}
              onClick={() => handleSuggestionClick(medicine)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {medicine.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 