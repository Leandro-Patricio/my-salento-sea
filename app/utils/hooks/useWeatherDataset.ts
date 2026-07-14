import { useState, useEffect } from "react";
import { transformExtent } from "ol/proj";
import { useWeatherData } from "@/app/components/MainMapPage/Contexts/WeatherDataContext";


type useWeatherDatasetType = {
    day: number;

}

export function useWeatherDataset({ day }: useWeatherDatasetType)
{
    const { getOrFetchDay } = useWeatherData();

    const [dataset, setDataset] = useState<{
        extent3857: number[] | null;
        extent4326: number[] | null;
        dimensions: { lons: number; lats: number } | null;
    }>({ extent3857: null, extent4326: null, dimensions: null });

    useEffect(() =>
    {
        let isCurrent = true;

        getOrFetchDay(day).then((dailyData) =>
        {
            if (!dailyData || !isCurrent) return;

            const nLons = dailyData.lons.length;
            const nLats = dailyData.lats.length;

            const extent4326 = [
                dailyData.lons[0],
                dailyData.lats[0],
                dailyData.lons[nLons - 1],
                dailyData.lats[nLats - 1]
            ];
            const extent3857 = transformExtent(extent4326, "EPSG:4326", "EPSG:3857");

            setDataset({
                extent3857,
                extent4326,
                dimensions: { lons: nLons, lats: nLats }
            });
        });

        return () => { isCurrent = false; };
    }, [day, getOrFetchDay]);

    return dataset;
}