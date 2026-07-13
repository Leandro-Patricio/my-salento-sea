export interface DailyMetrics
{
    temperature: number[][][]; // [time][lat][lon]
    wind_speed: number[][][];  // [time][lat][lon]
    wind_dir: number[][][];    // [time][lat][lon]
}

export interface DailySliceResponse
{
    day: number;
    lats: number[];
    lons: number[];
    times: number[];
    metrics: {
        temperature: Float32Array | number[];
        wind_speed: Float64Array | number[];
        wind_dir: Float64Array | number[];
    };
}