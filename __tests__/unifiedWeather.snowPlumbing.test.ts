import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'node:path'

// Helper to create a mock Next.js API response
function createMockRes() {
  let statusCode = 0
  let payload: unknown
  const headers: Record<string, string> = {}
  const res: Partial<NextApiResponse> & { _getStatus: () => number; _getJSON: () => unknown } = {
    setHeader: (name: string, value: string) => {
      headers[name] = value
      return res as NextApiResponse
    },
    status: (code: number) => {
      statusCode = code
      return res as NextApiResponse
    },
    json: (data: unknown) => {
      payload = data
      return res as NextApiResponse
    },
    _getStatus: () => statusCode,
    _getJSON: () => payload,
  }
  return res as NextApiResponse & { _getStatus: () => number; _getJSON: () => unknown }
}

describe('Unified Weather API – snow plumbing from Open-Meteo', () => {
  const servicesModuleId = require.resolve('../../lib/services/weatherService', {
    paths: [path.join(process.cwd(), 'pages', 'api')],
  })

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.OPENWEATHER_KEY = 'test-ow-key'
    delete process.env.STORMGLASS_SECRET_KEY
    delete process.env.STORMGLASS_API_KEY
  })

  test('maps snowDepthCm and snowfallRateMmH from Open-Meteo into hourly', async () => {
    const now = new Date()
    const t0 = new Date(now)
    t0.setMinutes(0, 0, 0)
    const t1 = new Date(t0.getTime() + 60 * 60 * 1000)

    const toOMTime = (d: Date) => {
      // Open-Meteo times are in local (ISO without Z); handler appends 'Z' then adjusts with offset
      const iso = d.toISOString().slice(0, 19)
      return iso.replace('T', ' ')
    }

    // Mock the services module that the handler dynamically imports
    jest.doMock(servicesModuleId, () => {
      return {
        __esModule: true,
        // Minimal OpenWeather payload; hourly empty so handler synthesizes from Open-Meteo
        getFullWeather: jest.fn().mockResolvedValue({ current: {}, hourly: [], daily: [], source: 'onecall3' }),
        fetchStormglassTides: jest.fn(),
        fetchStormglassMarine: jest.fn(),
        getAirPollution: jest.fn().mockResolvedValue({ list: [] }),
        fetchOpenMeteoAirPollen: jest.fn().mockResolvedValue({}),
        fetchOpenMeteoWeather: jest.fn().mockResolvedValue({
          utc_offset_seconds: 0,
          hourly: {
            time: [toOMTime(t0), toOMTime(t1)],
            pressure_msl: [1013, 1012],
            temperature_2m: [0, -1],
            // Open-Meteo units: snowfall in cm over last hour; snow_depth in cm
            snowfall: [1.5, 0],
            snow_depth: [12, 8],
          },
        }),
      }
    })

    const handler = (await import('../pages/api/unified-weather')).default as (req: NextApiRequest, res: NextApiResponse) => Promise<void>

    const req = {
      query: { lat: '51.5', lon: '-0.1', mode: 'land' },
    } as unknown as NextApiRequest
    const res = createMockRes()

    await handler(req, res)

    expect(res._getStatus()).toBe(200)
    const body = res._getJSON() as { hourly?: Array<{ snowDepthCm?: number; snowfallRateMmH?: number }> }
    expect(Array.isArray(body.hourly)).toBe(true)
    expect((body.hourly?.length || 0)).toBeGreaterThan(0)

    const h0 = body.hourly![0]!
    expect(typeof h0.snowDepthCm).toBe('number')
    expect(typeof h0.snowfallRateMmH).toBe('number')

    // Validate unit conversion: 1.5 cm/h => 15 mm/h
    expect(h0.snowDepthCm).toBeCloseTo(12)
    expect(h0.snowfallRateMmH).toBeCloseTo(15)
  })
})
