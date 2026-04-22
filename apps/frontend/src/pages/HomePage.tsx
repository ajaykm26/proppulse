import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';

/**
 * Home / Landing page.
 * Features a hero section with the PropPulse tagline and a search bar.
 */
export function HomePage() {
  const navigate = useNavigate();

  function handleSearch(query: string) {
    // Navigate to the search page with the query pre-filled
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <span>✨</span>
            <span>Powered by AI</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            AI-powered real estate intelligence
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Search smarter. Discover properties that match what you're really looking for —
            describe it in plain English and let AI do the rest.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              placeholder={'Try "3BR condo in Brooklyn under $1M"...'}
            />
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
          Why PropPulse?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              icon: '🤖',
              title: 'AI Search',
              description:
                'Describe your ideal home in plain English. Our AI translates it into precise filters automatically.',
            },
            {
              icon: '📊',
              title: 'Market Insights',
              description:
                'Get AI-generated summaries and market trends for every neighborhood you explore.',
            },
            {
              icon: '🔔',
              title: 'Smart Alerts',
              description:
                'Save searches and get notified the moment a matching property hits the market.',
            },
          ].map(({ icon, title, description }) => (
            <div
              key={title}
              className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
