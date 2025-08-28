import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VenueSearch } from './VenueSearch';
import { FiX, FiClock, FiMapPin, FiCalendar, FiChevronRight, FiCheck, FiCopy, FiMessageSquare, FiMail } from 'react-icons/fi';

interface ShareModalProps {
  activityId: string;
  activityName: string;
  onClose: () => void;
}

interface Venue {
  placeId: string;
  name: string;
  address: string;
  latLng: { lat: number; lng: number };
  rating?: number;
  priceLevel?: number;
  photoUrl?: string;
}

const spring: any = {
  type: 'spring',
  damping: 25,
  stiffness: 300
};

export const ShareModal: React.FC<ShareModalProps> = ({
  activityId,
  activityName,
  onClose
}) => {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow' | 'pick'>('today');
  const [customDate, setCustomDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().split('T')[0];
  });
  const [showVenueSearch, setShowVenueSearch] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleShare = async (method: 'whatsapp' | 'email' | 'copy') => {
    setIsSharing(true);
    
    try {
      const dateText = selectedDate === 'today' ? 'today' : 
                     selectedDate === 'tomorrow' ? 'tomorrow' : 
                     `on ${new Date(customDate).toLocaleDateString()}`;
      
      const venueText = selectedVenue?.name || 'a place';
      const message = `Do you fancy ${activityName.toLowerCase()} with me ${dateText} at ${venueText}?`;
      
      if (method === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      } else if (method === 'email') {
        window.open(`mailto:?subject=Let's ${activityName}&body=${encodeURIComponent(message)}`, '_blank');
      } else {
        await navigator.clipboard.writeText(message);
        // TODO: Show toast notification for copy success
      }
      
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const getDateDisplay = () => {
    if (selectedDate === 'today') return 'Today';
    if (selectedDate === 'tomorrow') return 'Tomorrow';
    return new Date(customDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={spring}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Plan {activityName}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <FiClock className="w-4 h-4 mr-1.5" />
              <span>{getDateDisplay()}</span>
              {selectedVenue && (
                <>
                  <span className="mx-2">•</span>
                  <FiMapPin className="w-4 h-4 mr-1.5" />
                  <span>{selectedVenue.name || 'Select location'}</span>
                </>
              )}
            </div>
          </div>
          
          {/* When? Section */}
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-medium text-gray-900 mb-3">When?</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedDate('today')}
                className={`py-3 px-2 rounded-lg text-sm font-medium ${
                  selectedDate === 'today'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate('tomorrow')}
                className={`py-3 px-2 rounded-lg text-sm font-medium ${
                  selectedDate === 'tomorrow'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                Tomorrow
              </button>
              <div className="relative">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setSelectedDate('pick');
                    setCustomDate(e.target.value);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full h-full absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className={`py-3 px-2 rounded-lg text-sm font-medium text-center ${
                  selectedDate === 'pick'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}>
                  {selectedDate === 'pick' ? getDateDisplay() : 'Pick date'}
                </div>
              </div>
            </div>
          </div>

          {/* Where? Section */}
          <div className="p-5">
            <h3 className="font-medium text-gray-900 mb-3">Where?</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setSelectedVenue({
                    placeId: 'my-place',
                    name: 'My place',
                    address: 'At my location',
                    latLng: { lat: 0, lng: 0 }
                  });
                }}
                className={`w-full p-4 text-left rounded-lg flex items-center ${
                  selectedVenue?.placeId === 'my-place'
                    ? 'bg-blue-50 border-2 border-blue-300'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg width="20" height="20" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">My place</div>
                  <div className="text-xs text-gray-500">At my location</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedVenue({
                    placeId: 'your-place',
                    name: 'Your place',
                    address: 'At your location',
                    latLng: { lat: 0, lng: 0 }
                  });
                }}
                className={`w-full p-4 text-left rounded-lg flex items-center ${
                  selectedVenue?.placeId === 'your-place'
                    ? 'bg-blue-50 border-2 border-blue-300'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg width="20" height="20" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Your place</div>
                  <div className="text-xs text-gray-500">At your location</div>
                </div>
              </button>

              <button
                onClick={() => setShowVenueSearch(true)}
                className="w-full p-4 text-left rounded-lg flex items-center bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300"
              >
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                  <svg width="20" height="20" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="text-gray-700">Find a venue</div>
              </button>

              {selectedVenue?.placeId && selectedVenue.placeId !== 'my-place' && selectedVenue.placeId !== 'your-place' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{selectedVenue.name}</div>
                    <div className="text-xs text-gray-500">{selectedVenue.address}</div>
                  </div>
                  <button 
                    onClick={() => setSelectedVenue(null)}
                    className="text-gray-400 hover:text-gray-600 ml-2"
                  >
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Bottom action buttons */}
        <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleShare('whatsapp')}
              disabled={isSharing}
              className="flex items-center justify-center bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={() => handleShare('copy')}
              disabled={isSharing}
              className="bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Message'}
            </button>
          </div>
        </div>

        {/* Venue Search Modal */}
        <AnimatePresence>
          {showVenueSearch && (
            <motion.div 
              className="absolute inset-0 bg-white z-20 p-4 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween' }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Find a venue</h3>
                <button 
                  onClick={() => setShowVenueSearch(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <VenueSearch
                activityName={activityName}
                onVenuesSelected={(venues) => {
                  if (venues.length > 0) {
                    setSelectedVenue(venues[0]);
                  }
                  setShowVenueSearch(false);
                }}
                maxSelections={1}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
