import { useUser, RedirectToSignIn } from '@clerk/clerk-react';

/**
 * User dashboard page.
 * Requires authentication — redirects to Clerk sign-in if not authenticated.
 *
 * TODO:
 * - Load user's saved searches from the backend
 * - Show recently viewed properties
 * - Show market alerts
 */
export function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();

  // Wait for Clerk to load
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        Loading...
      </div>
    );
  }

  // Redirect unauthenticated users to sign-in
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName ?? user.emailAddresses[0]?.emailAddress ?? 'there'} 👋
        </h1>
        <p className="text-gray-600 mt-1">Here's your real estate activity at a glance.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Saved Searches', value: '—', icon: '🔍' },
          { label: 'Saved Properties', value: '—', icon: '❤️' },
          { label: 'New Matches', value: '—', icon: '🔔' },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center gap-4"
          >
            <div className="text-3xl">{icon}</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Saved searches placeholder */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Saved Searches</h2>
        <div className="text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">📋</div>
          <p>No saved searches yet.</p>
          <p className="text-sm mt-1">
            <a href="/search" className="text-primary-600 hover:underline">
              Run a search
            </a>{' '}
            and save it to track new listings automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
