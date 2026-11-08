import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface SearchResult {
  pageIndex: number;
  textId?: string;
  matchedText: string;
  source: 'annotation' | 'pdf';
}

export const SearchBar: React.FC = () => {
  const isSearchOpen = useAppStore((state) => state.isSearchOpen);
  const toggleSearch = useAppStore((state) => state.toggleSearch);
  const document = useAppStore((state) => state.document);
  const setActivePage = useAppStore((state) => state.setActivePage);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setCurrentIndex(0);
    }
  }, [isSearchOpen]);

  // Search logic across all pages and text elements
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }

    const matchedList: SearchResult[] = [];

    document.pages.forEach((page, pIdx) => {
      // 1. Search in text annotations
      page.layers.forEach((layer) => {
        if (layer.texts) {
          layer.texts.forEach((t) => {
            if (t.text.toLowerCase().includes(trimmed)) {
              matchedList.push({
                pageIndex: pIdx,
                textId: t.id,
                matchedText: t.text,
                source: 'annotation',
              });
            }
          });
        }
      });
    });

    setResults(matchedList);
    setCurrentIndex(0);

    if (matchedList.length > 0) {
      setActivePage(matchedList[0].pageIndex);
    }
  }, [query, document.pages, setActivePage]);

  const handleNext = () => {
    if (results.length === 0) return;
    const next = (currentIndex + 1) % results.length;
    setCurrentIndex(next);
    setActivePage(results[next].pageIndex);
  };

  const handlePrev = () => {
    if (results.length === 0) return;
    const prev = (currentIndex - 1 + results.length) % results.length;
    setCurrentIndex(prev);
    setActivePage(results[prev].pageIndex);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      toggleSearch(false);
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div className="absolute top-16 right-6 z-50 flex items-center bg-slate-900 border border-slate-700 shadow-2xl rounded-lg p-1.5 gap-2 text-slate-200 text-xs animate-fadeIn">
      <div className="flex items-center gap-1.5 pl-1.5">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar texto en notas (Ctrl+F)..."
          className="bg-transparent border-none focus:outline-none text-slate-100 placeholder-slate-500 w-48 text-xs py-1"
        />
      </div>

      {query && (
        <span className="text-[11px] text-slate-400 font-mono select-none px-1">
          {results.length > 0 ? `${currentIndex + 1}/${results.length}` : 'Sin resultados'}
        </span>
      )}

      <div className="flex items-center gap-0.5 border-l border-slate-700 pl-1">
        <button
          onClick={handlePrev}
          disabled={results.length === 0}
          title="Anterior (Shift+Enter)"
          className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleNext}
          disabled={results.length === 0}
          title="Siguiente (Enter)"
          className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => toggleSearch(false)}
          title="Cerrar (Esc)"
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

