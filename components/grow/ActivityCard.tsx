import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Share2, Users, Clock, MapPin, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api } from '../../lib/grow/api';
import { auth } from '../../lib/grow/auth';
import { useTranslationMap } from '../../lib/translation/useTranslationMap';

export interface Activity {
  id: string;
  name?: string;
  category?: string;
  suitabilityScore?: number;
  weatherReason?: string;
  duration?: string;
  difficulty?: string;
  location?: string;
  participants?: number | string[] | string;
  image?: string;
}

interface ActivityCardProps {
  activity: Activity;
  showWeatherReason?: boolean;
  onJoin?: (activity: Activity) => void;
}

export function ActivityCard({ activity, showWeatherReason = false, onJoin }: ActivityCardProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  // Translate activity name
  const translationInputs = useMemo(
    () => [activity.name ?? 'Garden activity'],
    [activity.name]
  );
  const { t } = useTranslationMap(translationInputs);

  // Helper function to safely get participant count as a number
  const getParticipantCount = (participants: Activity['participants']): number => {
    try {
      if (Array.isArray(participants)) {
        return Math.max(0, participants.length);
      }
      if (typeof participants === 'number' && participants >= 0 && Number.isFinite(participants)) {
        return Math.floor(Math.max(0, participants));
      }
      if (typeof participants === 'string') {
        const parsed = parseInt(participants, 10);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
      }
      return 0; // Default fallback
    } catch (error) {
      console.error('Error getting participant count:', error, participants);
      return 0;
    }
  };

  // Get image URL when component mounts
  React.useEffect(() => {
    // Use a default placeholder image for now
    if (activity.image && typeof activity.image === 'string') {
      setImageUrl(activity.image);
    } else {
      setImageUrl('https://images.unsplash.com/photo-1634133568072-9044251999f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&h=300');
    }
  }, [activity.image]);

  const getSuitabilityColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 50) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getSuitabilityText = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const participantCount = useMemo(
    () => getParticipantCount(activity.participants),
    [activity.participants]
  );

  const participantInitials = useMemo(() => {
    const safeCount = Math.max(0, Math.min(participantCount, 4));
    return Array.from({ length: safeCount }, (_, index) => String.fromCharCode(65 + index));
  }, [participantCount]);

  const handleShare = async () => {
    setIsSharing(true);

    // Mock sharing functionality
    const shareData = {
      title: t(activity.name ?? 'Grow Daisy activity'),
      text: `Join me for ${t(activity.name ?? 'this activity')}! Weather conditions are ${getSuitabilityText(
        Number(activity.suitabilityScore ?? 0)
      ).toLowerCase()}.`,
      url: `${window.location.origin}/activity/${activity.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback - copy to clipboard
        await navigator.clipboard.writeText(`${shareData.title} - ${shareData.text} ${shareData.url}`);
        alert('Activity details copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleJoinActivity = async () => {
    try {
      const accessToken = auth.getCurrentAccessToken();
      if (!accessToken) {
        alert('Please sign in to join activities');
        return;
      }

      await api.joinActivity(activity.id);
      alert(`Successfully joined "${t(activity.name ?? 'this activity')}"!`);

      // Refresh data if callback provided
      if (onJoin) {
        onJoin(activity);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Failed to join activity:', error);
      alert(err.message || 'Failed to join activity');
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48">
        {imageUrl && (
          <ImageWithFallback
            src={imageUrl}
            alt={t(activity.name ?? 'Garden activity')}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute top-2 right-2">
          <Badge className={getSuitabilityColor(Number(activity.suitabilityScore ?? 0))}>
            {Math.round(Number(activity.suitabilityScore ?? 0))}% {getSuitabilityText(Number(activity.suitabilityScore ?? 0))}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t(activity.name ?? 'Garden activity')}</CardTitle>
        {showWeatherReason && activity.weatherReason && (
          <p className="text-sm text-muted-foreground">{activity.weatherReason}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{activity.duration ?? 'Flexible'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-muted-foreground" />
            <span>{activity.difficulty ?? 'Varied'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{activity.location ?? 'Your garden'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{participantCount} people</span>
          </div>
        </div>

        {/* Participant avatars */}
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            {participantInitials.map((initial, index) => (
              <Avatar key={index} className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-xs">{initial}</AvatarFallback>
              </Avatar>
            ))}
            {participantCount > participantInitials.length && (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                +{participantCount - participantInitials.length}
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground">interested</span>
        </div>

        <div className="flex space-x-2">
          <Button size="sm" onClick={handleJoinActivity} className="flex-1">
            Join Activity
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            disabled={isSharing}
            className="px-3"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
