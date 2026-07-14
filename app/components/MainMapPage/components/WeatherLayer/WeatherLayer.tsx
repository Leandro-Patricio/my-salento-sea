"use client";

import { useSearchParams } from "next/navigation";
import { useWeatherData } from "@/app/components/MainMapPage/Contexts/WeatherDataContext";
import { useWeatherDataset } from "@/app/utils/hooks/useWeatherDataset";
import { MetricType } from "@/app/utils/constants/Scales";
import { useWebGLWeatherLayer, WeatherHoverData } from "@/app/utils/hooks/useWebGLWeatherLayer";
import { useState } from "react";
import WeatherTooltip from "../Tooltip/WeatherTooltip";

export default function WeatherLayer()
{
    const { getOrFetchDay } = useWeatherData();
    const searchParams = useSearchParams();

    const day = parseInt(searchParams.get("day") || "0", 10);
    const hour = parseInt(searchParams.get("hour") || "0", 10);
    const metric = (searchParams.get("metric") || "temperature") as MetricType;

    // 1. Busca os dados e resolve as extensões (apenas uma única chamada à API)
    const { extent3857, extent4326, dimensions, dailyData } = useWeatherDataset(day, getOrFetchDay);

    const [hoverData, setHoverData] = useState<WeatherHoverData | null>(null);

    // 2. Controla a renderização WebGL em tempo de execução de forma suave (Sem piscar!)
    useWebGLWeatherLayer({
        extent3857,
        extent4326,
        dimensions,
        dailyData,
        day,
        hour,
        metric,
        zIndex: 1, // Garante que as Boias (em zIndex maiores) fiquem por cima,
        onHover: setHoverData
    });

    return (
        <>
            {/* Desenha o popup holográfico seguindo o cursor */}
            <WeatherTooltip hoverData={hoverData} metric={metric} />
        </>
    )
}