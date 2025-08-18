import type { NextApiRequest, NextApiResponse } from 'next';
import { assessAirQualityConditions, AirQualityLevel } from '../../utils/airQualityUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test air quality data like what we're getting from the API
    const testAirQualityData = {
      overall: 57  // This should be MODERATE level
    };

    const assessment = assessAirQualityConditions(testAirQualityData);
    
    const response = {
      testData: testAirQualityData,
      assessment: assessment,
      shouldDisplay: assessment.overall >= AirQualityLevel.MODERATE,
      levels: {
        NONE: AirQualityLevel.NONE,
        GOOD: AirQualityLevel.GOOD,
        MODERATE: AirQualityLevel.MODERATE,
        UNHEALTHY_SENSITIVE: AirQualityLevel.UNHEALTHY_SENSITIVE,
        UNHEALTHY: AirQualityLevel.UNHEALTHY,
        VERY_UNHEALTHY: AirQualityLevel.VERY_UNHEALTHY,
        HAZARDOUS: AirQualityLevel.HAZARDOUS
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Air quality debug error:', error);
    res.status(500).json({ error: 'Failed to test air quality assessment' });
  }
}
