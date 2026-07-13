"use client";


import { MetricConfig, MetricType, STATIC_METRICS_LIST } from "@/app/utils/constants/Scales";
import { fetchDailyData } from "@/app/utils/fetchs/fetchDailyData";
import { DailySliceResponse } from "@/app/utils/types/weatherGrid";
import React, { createContext, RefObject, useCallback, useContext, useRef, useState } from "react";


interface WeatherContextType
{
    cache: Record<number, DailySliceResponse>;
    loadingDays: Record<number, boolean>;
    getOrFetchDay: (day: number) => Promise<DailySliceResponse | null>;
    availableMetrics: RefObject<MetricConfig[]>
}

const WeatherDataContext = createContext<WeatherContextType | undefined>(undefined);

export function WeatherDataProvider({ children }: { children: React.ReactNode })
{
    // Guarda os dados dos dias indexados por número: { 0: dataIndex0, 1: dataIndex1 }
    const [cache, setCache] = useState<Record<number, DailySliceResponse>>({});
    // Gerencia o loading individual de cada dia para a UI saber o que está baixando
    const [loadingDays, setLoadingDays] = useState<Record<number, boolean>>({});

    const availableMetrics = useRef<MetricConfig[]>(STATIC_METRICS_LIST);


    const getOrFetchDay = useCallback(async (day: number): Promise<DailySliceResponse | null> =>
    {
        // 1. RETORNO DO CACHE LOCAL
        if (cache[day])
        {
            return cache[day];
        }

        if (loadingDays[day]) return null;

        setLoadingDays((prev) => ({ ...prev, [day]: true }));

        // 2. BUSCA PROGRESSIVA
        const dailyData = await fetchDailyData(day);

        setLoadingDays((prev) => ({ ...prev, [day]: false }));

        if (dailyData)
        {
            setCache((prev) => ({ ...prev, [day]: dailyData }));

            // Inicializa a lista de métricas uma única vez
            if (availableMetrics.current.length === 0 && dailyData.metrics)
            {
                const rawKeys = Object.keys(dailyData.metrics) as MetricType[];
                const dynamicList = rawKeys.map((id) => ({
                    id,
                    name: STATIC_METRICS_LIST[+id]?.name || id,
                    icon: STATIC_METRICS_LIST[+id]?.icon || "📊"
                }));
                availableMetrics.current = (dynamicList);
            }

            return dailyData;
        }

        return null;
    }, [cache, loadingDays, availableMetrics]); // 🎯 Monitore os estados dos quais a função depende internamente

    return (
        <WeatherDataContext.Provider value={{ cache, loadingDays, getOrFetchDay, availableMetrics }}>
            {children}
        </WeatherDataContext.Provider>
    );
}

// Hook customizado para consumir o cache em qualquer lugar do front
export function useWeatherData()
{
    const context = useContext(WeatherDataContext);
    if (context === undefined)
    {
        throw new Error("useWeatherData deve ser usado dentro de um WeatherDataProvider");
    }
    return context;
}

// // Limpa o cache explicitamente
// const clearCache = ({ setCache, setLoadingDays }: { setCache: React.Dispatch<React.SetStateAction<Record<number, DailySliceResponse>>>, setLoadingDays: React.Dispatch<React.SetStateAction<Record<number, boolean>>> }) =>
// {
//     setCache({});
//     setLoadingDays({});
//     console.log("Cache meteorológico limpo.");
// };



