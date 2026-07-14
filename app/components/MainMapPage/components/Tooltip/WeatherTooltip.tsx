"use client";

import { MetricType, STATIC_METRICS_LIST } from "@/app/utils/constants/Scales";
import { WeatherHoverData } from "@/app/utils/hooks/useWebGLWeatherLayer";

interface WeatherTooltipProps
{
    hoverData: WeatherHoverData | null;
    metric: MetricType;
}

export default function WeatherTooltip({ hoverData, metric }: WeatherTooltipProps)
{
    if (!hoverData) return null;

    const { value, lat, lon, pixel } = hoverData;
    const [x, y] = pixel;

    // Busca as configurações visuais da métrica ativa (Ícone, Unidade, etc.)
    const metricConfig = STATIC_METRICS_LIST.find((m) => m.id === metric);
    const unit = metric === "temperature" ? "°C" : metric === "wind_speed" ? " nós" : "°";
    const icon = metricConfig?.icon || "🌡️";

    return (
        <div
            className="absolute pointer-events-none select-none"
            style={{
                left: x,
                top: y,
                zIndex: 9999,
                transform: "translate(0, 0)",
            }}
        >
            {/* Linha Guia em SVG */}
            <svg
                width="180"
                height="60"
                viewBox="0 0 180 60"
                className="absolute overflow-visible"
                style={{
                    left: 0,
                    bottom: 0,
                }}
            >
                {/* Ponto de âncora no cursor */}
                <circle cx="0" cy="60" r="3" className="fill-emerald-400 stroke-slate-900 stroke-2" />

                {/* Linha diagonal + Linha horizontal de suporte */}
                <path
                    d="M 0 60 L 30 30 L 170 30"
                    fill="none"
                    className="stroke-emerald-400/80 stroke-2"
                    strokeDasharray="100"
                    strokeDashoffset="0"
                />
            </svg>

            {/* Painel de Informações */}
            <div
                className="absolute flex flex-col font-mono text-xs whitespace-nowrap bg-gray-700/50 p-2 rounded-sm"
                style={{
                    left: 35,
                    bottom: -10,
                }}
            >
                {/* 🌡️ VALOR: Exibido ACIMA da linha horizontal */}
                <div
                    className="pb-0.5 text-white font-bold text-[13px] flex items-center gap-1"
                >
                    <span>{icon}</span>
                    <span>{value.toFixed(1)}{unit}</span>
                </div>

                {/* 🌍 COORDENADAS: Exibido ABAIXO da linha horizontal */}
                <div
                    className="pt-1 text-white font-medium text-[10px] flex flex-col gap-0.5"
                >
                    <span>LAT: {lat.toFixed(4)}° N</span>
                    <span>LON: {lon.toFixed(4)}° E</span>
                </div>
            </div>
        </div>
    );
}