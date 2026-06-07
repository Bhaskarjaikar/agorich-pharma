'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { searchAddress, MapplsAutoSuggestResult } from '@/lib/geo/mappls';

interface AddressSearchProps {
  value?: string;
  onChange?: (address: string) => void;
  onSelect?: (result: MapplsAutoSuggestResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function AddressSearch({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search your address...',
  className = '',
  disabled = false,
  autoFocus = false
}: AddressSearchProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MapplsAutoSuggestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchAddress(searchQuery);
      setSuggestions(results);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange?.(newValue);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(newValue);
    }, 300);
  };

  const handleSelect = (suggestion: MapplsAutoSuggestResult) => {
    const fullAddress = suggestion.placeAddress;
    setQuery(fullAddress);
    onChange?.(fullAddress);
    onSelect?.(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery('');
    onChange?.('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const formatSuggestionText = (suggestion: MapplsAutoSuggestResult) => {
    const parts = [];
    if (suggestion.structuredAddress?.houseNumber || suggestion.structuredAddress?.houseName) {
      parts.push(suggestion.structuredAddress.houseNumber || suggestion.structuredAddress.houseName);
    }
    if (suggestion.structuredAddress?.street) {
      parts.push(suggestion.structuredAddress.street);
    }
    if (suggestion.structuredAddress?.subLocality) {
      parts.push(suggestion.structuredAddress.subLocality);
    }
    if (suggestion.structuredAddress?.locality) {
      parts.push(suggestion.structuredAddress.locality);
    }
    if (suggestion.structuredAddress?.city) {
      parts.push(suggestion.structuredAddress.city);
    }
    return parts.length > 0 ? parts.join(', ') : suggestion.placeAddress;
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-muted disabled:cursor-not-allowed transition-shadow"
        />
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-background dark:bg-card border border-input rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.eLoc || `${suggestion.latitude}-${suggestion.longitude}`}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-muted flex items-start gap-3 transition-colors ${
                selectedIndex === index ? 'bg-primary/10' : ''
              }`}
            >
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {suggestion.placeName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {formatSuggestionText(suggestion)}
                </p>
                {suggestion.structuredAddress?.pincode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    PIN: {suggestion.structuredAddress.pincode}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && query.length >= 3 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-background dark:bg-card border border-input rounded-lg shadow-lg p-4 text-center text-muted-foreground">
          No addresses found. Try a different search term.
        </div>
      )}
    </div>
  );
}