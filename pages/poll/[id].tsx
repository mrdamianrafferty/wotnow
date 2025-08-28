// Landing page for poll links
import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { db } from '../../lib/db/sharing';

interface PollPageProps {
  poll: any;
}

export default function PollPage({ poll }: PollPageProps) {
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number | undefined>();
  const [accessibilityNeeded, setAccessibilityNeeded] = useState(false);

  const handleVote = async () => {
    if (!selectedVenue) return;

    try {
      const response = await fetch('/api/sharing/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll.id,
          placeId: selectedVenue,
          etaMinutes,
          accessibilityNeeded
        })
      });

      if (response.ok) {
        setHasVoted(true);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit vote');
      }
    } catch (error) {
      alert('Failed to submit vote');
    }
  };

  const timeRemaining = () => {
    const now = new Date();
    const closes = new Date(poll.closesAt);
    const diff = closes.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes > 0 ? `${minutes}m remaining` : 'Voting closed';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-6">
          <h1 className="text-xl font-bold">Vote: {poll.activityName}</h1>
          <p className="text-green-100">
            {new Date(poll.startTime).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <div className="text-sm text-green-200 mt-2">
            {timeRemaining()}
          </div>
        </div>

        {hasVoted ? (
          <div className="p-6 text-center">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <h2 className="text-lg font-semibold mb-2">Vote submitted!</h2>
            <p className="text-gray-600">We'll announce the winner soon.</p>
          </div>
        ) : (
          <>
            {/* Venue Options */}
            <div className="p-6">
              <h2 className="font-semibold mb-4">Choose your preferred venue:</h2>
              <div className="space-y-3">
                {poll.candidates.map((venue: any, index: number) => (
                  <div
                    key={venue.placeId}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedVenue === venue.placeId
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedVenue(venue.placeId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{index + 1}. {venue.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {venue.address.split(',')[0]}
                        </div>
                        {venue.rating && (
                          <div className="flex items-center mt-2">
                            <div className="flex text-yellow-400 text-sm">
                              {'★'.repeat(Math.floor(venue.rating))}
                            </div>
                            <span className="text-sm text-gray-500 ml-1">
                              {venue.rating}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {venue.votes} votes
                        </div>
                      </div>
                      {selectedVenue === venue.placeId && (
                        <div className="text-green-600 ml-2">✓</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Details */}
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Your ETA (optional)
                </label>
                <input
                  type="number"
                  placeholder="Minutes"
                  value={etaMinutes || ''}
                  onChange={(e) => setEtaMinutes(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accessibilityNeeded}
                  onChange={(e) => setAccessibilityNeeded(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">I need step-free access</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="p-6 bg-gray-50">
              <button
                onClick={handleVote}
                disabled={!selectedVenue}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Vote
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-4 text-center text-xs text-gray-500 border-t">
          Created with <span className="font-medium">WotNow</span> • 
          <a href="/" className="text-blue-600 hover:underline ml-1">
            Create your own
          </a>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = params?.id as string;
  
  if (!id) {
    return { notFound: true };
  }

  const poll = await db.getPoll(id);
  
  if (!poll) {
    return { notFound: true };
  }

  return {
    props: {
      poll: JSON.parse(JSON.stringify(poll))
    }
  };
};
