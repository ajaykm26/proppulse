import { useEffect, useState, FormEvent } from 'react';

interface SearchBarProps {
  /** Called when the user submits a search query */
  onSearch?: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

/**
 * Property search bar component.
 * Handles text input and form submission.
 * Backend integration is a TODO — currently UI-only.
 */
export function SearchBar({
  onSearch,
  placeholder = 'Search by city, zip code, or address...',
  initialValue = '',
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      onSearch?.(value.trim());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex gap-2">
      <div className="relative flex-1">
        {/* Search icon */}
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
        />
      </div>
      <button
        type="submit"
        className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
      >
        Search
      </button>
    </form>
  );
}
