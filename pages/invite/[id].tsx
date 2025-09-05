// Landing page for invite links
import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { db } from '../../lib/db/sharing';

type LatLng = { lat: number; lng: number };
interface Invite {
  id: string;
  activityName: string;
  placeName?: string;
  placeAddress?: string;
  placeLatLng?: LatLng;
  startTime: string | number | Date;
  endTime: string | number | Date;
}

interface InvitePageProps {
  invite: Invite;
}

export default function InvitePage({ invite }: InvitePageProps) {
  const [rsvp, setRsvp] = useState<'yes' | 'maybe' | 'no' | null>(null);

  const handleRSVP = async (response: 'yes' | 'maybe' | 'no') => {
    setRsvp(response);
    // Track analytics
    await fetch(`/api/sharing/invites?id=${invite.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rsvp', response })
    });
  };

  const openDirections = () => {
    if (invite.placeLatLng) {
      window.open(`https://maps.google.com/?q=${invite.placeLatLng.lat},${invite.placeLatLng.lng}`, '_blank');
    }
  };

  const addToCalendar = () => {
    const start = new Date(invite.startTime);
    const end = new Date(invite.endTime);
    const title = encodeURIComponent(`${invite.activityName} at ${invite.placeName || 'TBD'}`);
    const details = encodeURIComponent(`Created with WotNow\n${invite.placeAddress || ''}`);
    const location = encodeURIComponent(invite.placeAddress || '');
    
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${details}&location=${location}`;
    window.open(googleCalUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <h1 className="text-xl font-bold">{invite.activityName}</h1>
          <p className="text-blue-100">
            {new Date(invite.startTime).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Venue Info */}
        {invite.placeName && (
          <div className="p-6 border-b">
            <h2 className="font-semibold text-lg">{invite.placeName}</h2>
            {invite.placeAddress && (
              <p className="text-gray-600 mt-1">{invite.placeAddress}</p>
            )}
          </div>
        )}

        {/* RSVP Section */}
        <div className="p-6">
          <h3 className="font-medium mb-4">Will you join?</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['yes', 'maybe', 'no'] as const).map((option) => (
              <button
                key={option}
                onClick={() => handleRSVP(option)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  rsvp === option
                    ? option === 'yes' ? 'bg-green-600 text-white' :
                      option === 'maybe' ? 'bg-yellow-600 text-white' :
                      'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option === 'yes' ? "I'm in!" : option === 'maybe' ? 'Maybe' : "Can't make it"}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 space-y-3 bg-gray-50">
          <button
            onClick={addToCalendar}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Add to Calendar
          </button>
          
          {invite.placeLatLng && (
            <button
              onClick={openDirections}
              className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
            >
              Get Directions
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-xs text-gray-500 border-t">
          Created with <span className="font-medium">WotNow</span> • 
          <Link href="/" className="text-blue-600 hover:underline ml-1">
            Create your own
          </Link>
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

  const invite = await db.getInvite(id);
  
  if (!invite) {
    return { notFound: true };
  }

  return {
    props: {
      invite: JSON.parse(JSON.stringify(invite))
    }
  };
};
