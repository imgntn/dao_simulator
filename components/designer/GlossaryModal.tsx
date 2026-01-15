'use client';

import { useState, useEffect } from 'react';
import {
  FULL_GLOSSARY,
  getGlossaryGroupedByCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type GlossaryCategory,
  type GlossaryEntry,
} from '@/lib/dao-designer/glossary';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearchTerm?: string;
  initialCategory?: GlossaryCategory;
}

export function GlossaryModal({
  isOpen,
  onClose,
  initialSearchTerm = '',
  initialCategory,
}: GlossaryModalProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategory | 'all'>(
    initialCategory || 'all'
  );
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(initialSearchTerm);
      setSelectedCategory(initialCategory || 'all');
      setExpandedEntry(null);
    }
  }, [isOpen, initialSearchTerm, initialCategory]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groupedGlossary = getGlossaryGroupedByCategory();
  const categories = Object.keys(groupedGlossary) as GlossaryCategory[];

  // Filter entries based on search and category
  const getFilteredEntries = (): GlossaryEntry[] => {
    let entries =
      selectedCategory === 'all'
        ? Object.values(FULL_GLOSSARY)
        : groupedGlossary[selectedCategory] || [];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      entries = entries.filter(
        (entry) =>
          entry.term.toLowerCase().includes(search) ||
          entry.shortDescription.toLowerCase().includes(search) ||
          entry.longDescription.toLowerCase().includes(search)
      );
    }

    return entries.sort((a, b) => a.term.localeCompare(b.term));
  };

  const filteredEntries = getFilteredEntries();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Governance Glossary
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search terms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-full transition-colors flex items-center gap-1 ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{CATEGORY_ICONS[category]}</span>
                <span>{CATEGORY_LABELS[category]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Glossary entries */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-lg">No terms found</p>
              <p className="text-sm">Try a different search or category</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <GlossaryEntryCard
                  key={entry.term}
                  entry={entry}
                  isExpanded={expandedEntry === entry.term}
                  onToggle={() =>
                    setExpandedEntry(expandedEntry === entry.term ? null : entry.term)
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          {filteredEntries.length} term{filteredEntries.length !== 1 ? 's' : ''} •
          Click any term to expand
        </div>
      </div>
    </div>
  );
}

interface GlossaryEntryCardProps {
  entry: GlossaryEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function GlossaryEntryCard({ entry, isExpanded, onToggle }: GlossaryEntryCardProps) {
  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        isExpanded
          ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-3 text-left flex items-start gap-3"
      >
        <span className="text-lg">{CATEGORY_ICONS[entry.category]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {entry.term}
            </h3>
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
              {CATEGORY_LABELS[entry.category]}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {entry.shortDescription}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pl-12 space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {entry.longDescription}
          </p>

          {entry.realWorldExample && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Real-World Example
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {entry.realWorldExample}
              </p>
            </div>
          )}

          {entry.relatedTerms && entry.relatedTerms.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Related Terms
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.relatedTerms.map((term) => (
                  <span
                    key={term}
                    className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                  >
                    {term.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Button to open the glossary modal
 */
interface GlossaryButtonProps {
  onClick: () => void;
  className?: string;
}

export function GlossaryButton({ onClick, className = '' }: GlossaryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors ${className}`}
    >
      <span>📚</span>
      <span>Glossary</span>
    </button>
  );
}
