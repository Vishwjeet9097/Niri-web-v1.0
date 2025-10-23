import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  section?: string;
  description?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  maxHeight?: string;
  showSearch?: boolean;
  showSelectAll?: boolean;
  showSectionHeaders?: boolean;
  groupBySection?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search options...",
  className,
  disabled = false,
  maxHeight = "300px",
  showSearch = true,
  showSelectAll = true,
  showSectionHeaders = true,
  groupBySection = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group options by section if enabled
  const groupedOptions = groupBySection && showSectionHeaders
    ? filteredOptions.reduce((acc, option) => {
        const section = option.section || 'Other';
        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(option);
        return acc;
      }, {} as Record<string, MultiSelectOption[]>)
    : { 'All': filteredOptions };

  // Check if all options are selected
  const allSelected = options.length > 0 && value.length === options.length;
  const someSelected = value.length > 0 && value.length < options.length;

  // Handle select all
  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map(option => option.value));
    }
  };

  // Handle individual option toggle
  const handleOptionToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const allOptions = Object.values(groupedOptions).flat();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < allOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : allOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allOptions.length) {
          handleOptionToggle(allOptions[focusedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedOptions = options.filter(option => value.includes(option.value));

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          "w-full min-h-[40px] px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "hover:border-gray-400 transition-colors",
          disabled && "bg-gray-100 cursor-not-allowed opacity-50",
          isOpen && "ring-2 ring-blue-500 border-blue-500"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedOptions.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedOptions.slice(0, 3).map(option => (
                  <span
                    key={option.value}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                  >
                    {option.label}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptionToggle(option.value);
                      }}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedOptions.length > 3 && (
                  <span className="text-sm text-gray-500">
                    +{selectedOptions.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden"
          style={{ maxHeight }}
        >
          {/* Search Input */}
          {showSearch && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Select All Option */}
          {showSelectAll && options.length > 0 && (
            <div className="p-2 border-b border-gray-200">
              <button
                type="button"
                onClick={handleSelectAll}
                className={cn(
                  "w-full flex items-center px-2 py-2 text-sm rounded hover:bg-gray-100 transition-colors",
                  focusedIndex === -1 && "bg-gray-100"
                )}
              >
                {allSelected ? (
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
                ) : someSelected ? (
                  <div className="w-4 h-4 border-2 border-blue-600 rounded mr-2 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-sm" />
                  </div>
                ) : (
                  <Circle className="w-4 h-4 text-gray-400 mr-2" />
                )}
                <span className="font-medium">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  ({value.length}/{options.length})
                </span>
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
            {Object.entries(groupedOptions).map(([sectionName, sectionOptions]) => (
              <div key={sectionName}>
                {/* Section Header */}
                {showSectionHeaders && groupBySection && sectionName !== 'All' && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                    {sectionName}
                  </div>
                )}
                
                {/* Section Options */}
                {sectionOptions.map((option, index) => {
                  const globalIndex = Object.values(groupedOptions)
                    .flat()
                    .findIndex(opt => opt.value === option.value);
                  const isSelected = value.includes(option.value);
                  const isFocused = focusedIndex === globalIndex;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleOptionToggle(option.value)}
                      onMouseEnter={() => setFocusedIndex(globalIndex)}
                      className={cn(
                        "w-full flex items-start px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors",
                        isFocused && "bg-gray-100",
                        isSelected && "bg-blue-50"
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5 mr-3">
                        {isSelected ? (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
            
            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
