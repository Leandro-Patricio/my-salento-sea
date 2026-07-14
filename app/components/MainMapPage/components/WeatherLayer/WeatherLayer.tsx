"use client";

import { useSearchParams } from "next/navigation";
import { MetricType } from "@/app/utils/constants/Scales";
import { useWeatherDataset } from "@/app/utils/hooks/useWeatherDataset";
import { useWebGLWeatherLayer } from "@/app/utils/hooks/useWebGLWeatherLayer";


export default function WeatherLayer()
{
    const searchParams = useSearchParams();

    const day = parseInt(searchParams.get("day") || "0", 10);
    const hour = parseInt(searchParams.get("hour") || "0", 10);
    const metric = (searchParams.get("metric") || "temperature") as MetricType;

    // 1. Resolve os Dados
    const { extent3857, extent4326, dimensions } = useWeatherDataset({ day });

    // 2. Resolve a renderização no Mapa (zIndex: 1 garante que as boias em zIndex superior fiquem na frente!)
    useWebGLWeatherLayer({
        extent3857,
        extent4326,
        dimensions,
        day,
        hour,
        metric,
        zIndex: 1
    });

    return null;
}