import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  CopernicusProvider,
  CopernicusFetchOptions,
  CopernicusMarineBundle,
  CopernicusTimeseries,
} from './types';
import { getDatasetForCmemsRegion, getDatasetForRegion, type CopernicusDatasetConfig } from './regionRouter';

const execAsync = promisify(exec);

/**
 * Real Copernicus Marine Service provider using the CLI tool
 */
export class RealCopernicusProvider implements CopernicusProvider {
  private cliPath: string;
  private region?: string;
  private datasetConfig?: CopernicusDatasetConfig;

  constructor(region?: string) {
    // Assume copernicusmarine is in PATH (installed via pipx)
    this.cliPath = 'copernicusmarine';
    this.region = region;
    
    if (region) {
      // Try CMEMS region code first (IBI, NWS, BAL, MED, etc.)
      let config = getDatasetForCmemsRegion(region);
      
      // Fallback to ICES region name mapping
      if (!config) {
        config = getDatasetForRegion(region);
      }
      
      if (!config) {
        console.warn(`⚠️  No Copernicus dataset found for region: ${region}`);
      } else {
        this.datasetConfig = config;
        console.log(`   📍 Using ${config.region} regional model`);
      }
    }
  }

  async fetchBundle(options: CopernicusFetchOptions): Promise<CopernicusMarineBundle> {
    const { lat, lon, start, end } = options;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copernicus-'));
    
    try {
      console.log(`   🌊 Fetching Copernicus data for (${lat}, ${lon})...`);
      
      // Use regional datasets if configured, otherwise fall back to global
      const physicsDataset = this.datasetConfig?.physics || 'cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m';
      const bioDataset = this.datasetConfig?.biogeochemistry || 'cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m';
      const waveDataset = this.datasetConfig?.waves || 'cmems_mod_glo_wav_anfc_0.083deg_PT3H-i';
      
      // Progressive padding strategy for coastal locations
      // OPTIMIZED: Only try 2 padding values to reduce API calls from 10 to 5 per rectangle
      // This cuts ingestion time roughly in half (from 90+ minutes to ~45 minutes for 224 rectangles)
      const paddings = [0.25, 1.0]; // degrees (~28km, 111km) - skip 0.1° and 0.5° for speed
      let physicsData: CopernicusTimeseries | null = null;
      let bioData: CopernicusTimeseries | null = null;
      let waveData: CopernicusTimeseries | undefined;

      // Try physics with progressive padding
      for (const padding of paddings) {
        try {
          const thetaoFile = path.join(tempDir, `thetao_${padding}.nc`);
          await this.fetchDatasetWithPadding(
            physicsDataset,
            [],
            lat,
            lon,
            start,
            end,
            thetaoFile,
            padding
          );
          physicsData = await this.parseNetCDF(thetaoFile, 'physics');
          if (physicsData && this.hasValidData(physicsData)) {
            console.log(`   ✅ Physics data found with ${padding}° padding (~${Math.round(padding * 111)}km)`);
            break;
          }
        } catch (err) {
          const isTimeout = err instanceof Error && err.message.includes('timeout');
          const errorType = isTimeout ? '⏱️  Timeout' : '❌ Error';
          if (padding === paddings[paddings.length - 1]) {
            console.warn(`   ⚠️  No physics data available after trying all paddings (last attempt: ${errorType})`);
          } else if (isTimeout) {
            console.log(`   ⏱️  Timeout at ${padding}° padding, trying next...`);
          }
        }
      }

      // Try biogeochemical with progressive padding
      for (const padding of paddings) {
        try {
          const bioFile = path.join(tempDir, `bio_${padding}.nc`);
          await this.fetchDatasetWithPadding(
            bioDataset,
            [],
            lat,
            lon,
            start,
            end,
            bioFile,
            padding
          );
          bioData = await this.parseNetCDF(bioFile, 'biogeochemical');
          if (bioData && this.hasValidData(bioData)) {
            console.log(`   ✅ BGC data found with ${padding}° padding (~${Math.round(padding * 111)}km)`);
            break;
          }
        } catch (err) {
          const isTimeout = err instanceof Error && err.message.includes('timeout');
          const errorType = isTimeout ? '⏱️  Timeout' : '❌ Error';
          if (padding === paddings[paddings.length - 1]) {
            console.warn(`   ⚠️  No BGC data available after trying all paddings (last attempt: ${errorType})`);
          } else if (isTimeout) {
            console.log(`   ⏱️  Timeout at ${padding}° padding, trying next...`);
          }
        }
      }

      // Wave data is optional, try with single padding attempt
      for (const padding of [0.25]) {
        try {
          const waveFile = path.join(tempDir, `waves_${padding}.nc`);
          await this.fetchDatasetWithPadding(
            waveDataset,
            [],
            lat,
            lon,
            start,
            end,
            waveFile,
            padding
          );
          waveData = await this.parseNetCDF(waveFile, 'waves');
          if (waveData && this.hasValidData(waveData)) {
            console.log(`   ✅ Wave data found with ${padding}° padding`);
            break;
          }
        } catch (_err) {
          // Waves are optional, don't warn
        }
      }

      if (!physicsData || !bioData) {
        throw new Error('No valid physics or biogeochemical data found');
      }

      return {
        physics: physicsData!,
        biogeochemical: bioData!,
        waves: waveData,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`   ❌ Error fetching Copernicus data:`, error);
      throw error;
    } finally {
      // Clean up temp files
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  private hasValidData(timeseries: CopernicusTimeseries): boolean {
    // Check if we have at least one record with non-null data
    return timeseries.records.length > 0 && 
           timeseries.records.some(r => 
             Object.values(r.variables).some(v => v !== null && v !== undefined && !isNaN(v))
           );
  }

  private async fetchDatasetWithPadding(
    datasetId: string,
    variables: string[],
    lat: number,
    lon: number,
    start: string,
    end: string,
    outputFile: string,
    padding: number
  ): Promise<void> {
    // Adjust coordinates with specified padding
    const latMin = lat - padding;
    const latMax = lat + padding;
    const lonMin = lon - padding;
    const lonMax = lon + padding;

    // Format dates for Copernicus API (YYYY-MM-DD)
    const startDate = start.split('T')[0];
    const endDate = end.split('T')[0];

    // Build the CLI command with proper quoting
    // Each argument must be a separate element for proper shell escaping
    const cmdArgs = [
      'subset',
      '--dataset-id', datasetId,
    ];

    // Only add variable flags if variables are specified
    if (variables.length > 0) {
      variables.forEach(v => {
        cmdArgs.push('--variable', v);
      });
    }

    cmdArgs.push(
      '--minimum-longitude', lonMin.toString(),
      '--maximum-longitude', lonMax.toString(),
      '--minimum-latitude', latMin.toString(),
      '--maximum-latitude', latMax.toString(),
      '--start-datetime', startDate,
      '--end-datetime', endDate,
      '--output-filename', outputFile,
      '--overwrite'
    );

    // Build command string with proper quoting for shell
    const cmd = `${this.cliPath} ${cmdArgs.map(arg =>
      arg.toString().includes(' ') ? `"${arg}"` : arg
    ).join(' ')}`;

    const { stderr } = await execAsync(cmd, {
      timeout: 60000, // 60 second timeout to prevent indefinite hangs
      killSignal: 'SIGTERM', // Graceful termination
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
      },
    });

    if (stderr && !stderr.includes('INFO')) {
      throw new Error(stderr);
    }
  }

  private async parseNetCDF(
    filePath: string,
    _dataType: 'physics' | 'biogeochemical' | 'waves'
  ): Promise<CopernicusTimeseries> {
    // Use Python with xarray to parse NetCDF
    const pythonScript = `
import xarray as xr
import json
import sys

try:
    ds = xr.open_dataset('${filePath}')
    
    # Extract all variables
    records = []
    
    # Get dimensions
    times = ds.time.values if 'time' in ds.dims else []
    depths = ds.depth.values if 'depth' in ds.dims else [0]
    lats = ds.latitude.values if 'latitude' in ds.dims else ds.lat.values
    lons = ds.longitude.values if 'longitude' in ds.dims else ds.lon.values
    
    # Convert to Python lists
    import numpy as np
    times = [str(t) for t in times]
    depths = [float(d) for d in depths]
    lat = float(lats[0] if len(lats.shape) == 1 else lats[0, 0])
    lon = float(lons[0] if len(lons.shape) == 1 else lons[0, 0])
    
    # Get variable names (exclude coordinates)
    var_names = [v for v in ds.data_vars if v not in ['latitude', 'longitude', 'lat', 'lon', 'time', 'depth']]
    
    # Extract data for each time/depth combination
    for time_idx, time in enumerate(times):
        for depth_idx, depth in enumerate(depths):
            variables = {}
            for var in var_names:
                try:
                    if 'depth' in ds[var].dims:
                        val = ds[var].isel(time=time_idx, depth=depth_idx).values
                    else:
                        val = ds[var].isel(time=time_idx).values
                    
                    # Handle various array shapes
                    if hasattr(val, 'item'):
                        val = val.item()
                    elif hasattr(val, '__len__') and len(val) > 0:
                        val = float(val[0]) if len(val.shape) == 1 else float(val[0, 0])
                    
                    # Check for NaN
                    if not np.isnan(val):
                        variables[var] = float(val)
                except Exception as e:
                    pass
            
            if variables:  # Only add if we have data
                records.append({
                    'time': time,
                    'depth': depth,
                    'lat': lat,
                    'lon': lon,
                    'variables': variables
                })
    
    result = {
        'datasetId': ds.attrs.get('id', 'unknown'),
        'variables': var_names,
        'records': records,
        'source': 'copernicus'
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    const pythonFile = path.join(path.dirname(filePath), 'parse.py');
    fs.writeFileSync(pythonFile, pythonScript);

    try {
      const { stdout, stderr } = await execAsync(`python3 ${pythonFile}`, {
        env: {
          ...process.env,
          PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
        },
      });

      if (stderr) {
        const errorData = JSON.parse(stderr);
        throw new Error(`Failed to parse NetCDF: ${errorData.error}`);
      }

      const result = JSON.parse(stdout);
      return result as CopernicusTimeseries;
    } finally {
      fs.unlinkSync(pythonFile);
    }
  }
}
