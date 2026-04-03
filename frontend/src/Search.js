import React, { useState } from "react";

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    // Backend simülasyonu
    setTimeout(() => {
      // Burası ileride veritabanından gelecek verilerle dolacak
      setResults([]);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Sadece Search Bar */}
        <form
          onSubmit={handleSearch}
          className="relative flex items-center gap-3"
        >
          <div className="relative flex-grow">
            {/* Arama İkonu */}
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
              placeholder="Search for private lessons or course recordings..."
              className="w-full h-16 pl-14 pr-6 rounded-2xl border-2 border-gray-100 focus:border-blue-600 focus:outline-none text-lg transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="h-16 px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg"
          >
            Search
          </button>
        </form>

        {/* Sonuç Alanı (Sadece arama yapıldığında veya yüklenirken görünür) */}
        <div className="mt-6">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500 font-medium">
                Searching database...
              </span>
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-500 text-lg">
                No results found for{" "}
                <span className="font-bold">"{searchTerm}"</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
