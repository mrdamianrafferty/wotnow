/**
 * SmartWateringCard Component
 *
 * Displays intelligent watering recommendations based on
 * soil moisture, rain forecast, temperature, wind, and humidity.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Droplets,
  CloudRain,
  Wind,
  Thermometer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { type WateringRecommendation } from '../../hooks/useWeatherTasks';

interface SmartWateringCardProps {
  recommendation: WateringRecommendation;
  soilMoisture?: number;
}

function getWateringIcon(shouldWater: boolean, adjustmentFactor: number) {
  if (!shouldWater) return XCircle;
  if (adjustmentFactor >= 1.3) return AlertCircle;
  return CheckCircle2;
}

function getWateringColor(shouldWater: boolean, adjustmentFactor: number) {
  if (!shouldWater) {
    return {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-900',
    };
  }
  if (adjustmentFactor >= 1.3) {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      text: 'text-amber-900',
    };
  }
  return {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    text: 'text-green-900',
  };
}

function DetailIcon({ detail }: { detail: string }) {
  const lowerDetail = detail.toLowerCase();
  if (lowerDetail.includes('rain')) return <CloudRain className="h-3 w-3" />;
  if (lowerDetail.includes('wind')) return <Wind className="h-3 w-3" />;
  if (lowerDetail.includes('temp')) return <Thermometer className="h-3 w-3" />;
  if (lowerDetail.includes('humid')) return <Droplets className="h-3 w-3" />;
  if (lowerDetail.includes('soil') || lowerDetail.includes('moisture')) return <Droplets className="h-3 w-3" />;
  return <AlertCircle className="h-3 w-3" />;
}

export function SmartWateringCard({ recommendation, soilMoisture }: SmartWateringCardProps) {
  const {
    shouldWater,
    reason,
    nextWateringDate,
    adjustmentFactor,
    details,
  } = recommendation;

  const colors = getWateringColor(shouldWater, adjustmentFactor);
  const StatusIcon = getWateringIcon(shouldWater, adjustmentFactor);

  const adjustmentText = adjustmentFactor >= 1.3
    ? `+${Math.round((adjustmentFactor - 1) * 100)}% more water needed`
    : adjustmentFactor <= 0.7
      ? `${Math.round((1 - adjustmentFactor) * 100)}% less water needed`
      : 'Normal amount';

  return (
    <Card className={colors.border}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Smart Watering
          </div>
          <Badge variant={shouldWater ? 'default' : 'secondary'}>
            {shouldWater ? 'Water Today' : 'Skip Today'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main recommendation */}
        <div className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${colors.bg}`}>
              <StatusIcon className={`h-6 w-6 ${colors.icon}`} />
            </div>
            <div className="flex-1">
              <p className={`font-medium ${colors.text}`}>
                {shouldWater ? 'Watering Recommended' : 'Skip Watering Today'}
              </p>
              <p className={`text-sm mt-1 ${colors.text} opacity-80`}>{reason}</p>
            </div>
          </div>
        </div>

        {/* Soil moisture indicator */}
        {soilMoisture !== undefined && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Current Soil Moisture</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    soilMoisture < 25 ? 'bg-red-500' :
                    soilMoisture < 40 ? 'bg-amber-500' :
                    soilMoisture < 60 ? 'bg-green-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, soilMoisture)}%` }}
                />
              </div>
              <span className="text-sm font-medium">{Math.round(soilMoisture)}%</span>
            </div>
          </div>
        )}

        {/* Adjustment factor */}
        {shouldWater && adjustmentFactor !== 1.0 && (
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            adjustmentFactor >= 1.3 ? 'bg-amber-50' : 'bg-blue-50'
          }`}>
            <span className="text-sm">Water Adjustment</span>
            <span className={`text-sm font-medium ${
              adjustmentFactor >= 1.3 ? 'text-amber-700' : 'text-blue-700'
            }`}>
              {adjustmentText}
            </span>
          </div>
        )}

        {/* Contributing factors */}
        {details.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Weather Factors
            </p>
            <div className="space-y-1.5">
              {details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <DetailIcon detail={detail} />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next watering date */}
        {!shouldWater && nextWateringDate && (
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Check again: <span className="font-medium">{nextWateringDate}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
