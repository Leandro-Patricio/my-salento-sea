"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWeatherData } from "@/app/components/MainMapPage/Contexts/WeatherDataContext";

export default function TimelineSlider()
{
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
    const { getOrFetchDay } = useWeatherData();

    // 1. Lê os estados direto da URL (com fallbacks seguros)
    const day = parseInt(params.get("day") || "0", 10);
    const hour = parseInt(params.get("hour") || "0", 10);

    // Estados locais para controle da animação (Play/Pause/Speed)
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(500); // Milissegundos por frame (quanto menor, mais rápido)

    const animationRef = useRef<NodeJS.Timeout | null>(null);

    // 2. Função centralizada para atualizar a URL de forma reativa
    const updateTimelineUrl = (newDay: number, newHour: number) =>
    {
        params.set("day", newDay.toString());
        params.set("hour", newHour.toString());
        router.push(`/?${params.toString()}`);
    };

    // 3. Pré-busca reativa: Sempre que o dia mudar na URL, garante que o cache local da RAM o possua
    useEffect(() => { getOrFetchDay(day); }, [day, getOrFetchDay]);

    // 4. Efeito que gerencia o "Play" (Linha do tempo rodando sozinha)
    useEffect(() =>
    {
        if (isPlaying)
        {
            animationRef.current = setInterval(() =>
            {
                let nextHour = hour + 1;
                let nextDay = day;

                if (nextHour > 23)
                {
                    nextHour = 0;
                    nextDay = day + 1;
                }

                // Limita a previsão aos 9 dias (índices de 0 a 8)
                if (nextDay > 8)
                {
                    nextDay = 0;
                    nextHour = 0;
                    setIsPlaying(false);
                    if (animationRef.current) clearInterval(animationRef.current);
                    return;
                }

                updateTimelineUrl(nextDay, nextHour);
            }, speed);
        } else
        {
            if (animationRef.current) clearInterval(animationRef.current);
        }

        return () =>
        {
            if (animationRef.current) clearInterval(animationRef.current);
        };
    }, [isPlaying, day, hour, speed]);

    // Controles manuais de navegação por Dia
    const handleNextDay = () =>
    {
        if (day < 8) updateTimelineUrl(day + 1, hour);
    };

    const handlePrevDay = () =>
    {
        if (day > 0) updateTimelineUrl(day - 1, hour);
    };

    // Controles manuais de Velocidade (Acelerar / Desacelerar)
    const handleSpeedUp = () =>
    {
        setSpeed((prev) => Math.max(100, prev - 150)); // Mínimo de 100ms por frame
    };

    const handleSlowDown = () =>
    {
        setSpeed((prev) => Math.min(2000, prev + 150)); // Máximo de 2000ms por frame
    };

    return (
        <div className="fixed bottom-0 left-0 w-full bg-slate-950/95 border-t border-slate-800 text-white p-4 z-50 flex flex-col md:flex-row items-center gap-4 shadow-2xl backdrop-blur-md">

            {/* Menu de Controles de Reprodução */}
            <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
                <button
                    onClick={handlePrevDay}
                    disabled={day === 0}
                    className="p-2 hover:bg-slate-800 rounded text-xs disabled:opacity-40"
                    title="Dia Anterior"
                >
                    ⏮ Dia
                </button>

                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium text-xs tracking-wider uppercase transition-colors min-w-[70px]"
                >
                    {isPlaying ? "|| Pausa" : "▶ Play"}
                </button>

                <button
                    onClick={handleNextDay}
                    disabled={day === 8}
                    className="p-2 hover:bg-slate-800 rounded text-xs disabled:opacity-40"
                    title="Próximo Dia"
                >
                    Dia ⏭
                </button>

                <div className={`${isPlaying ? "flex" : "hidden"} items-center border-l border-slate-800 pl-2 ml-1 gap-1`}>
                    <button onClick={handleSlowDown} className="p-1 hover:bg-slate-800 rounded text-xs" title="Diminuir Velocidade">-</button>
                    <span className="text-[10px] text-slate-400 font-mono">{(1000 / speed).toFixed(1)}x</span>
                    <button onClick={handleSpeedUp} className="p-1 hover:bg-slate-800 rounded text-xs" title="Aumentar Velocidade">+</button>
                </div>
            </div>

            {/* Info Atual e o Slider de Horas */}
            <div className="flex-1 w-full flex items-center gap-4">
                <div className="text-sm font-mono min-w-30 text-center bg-slate-900 px-3 py-1 rounded border border-slate-800">
                    Dia {day} — <span className="text-blue-400 font-bold">{hour.toString().padStart(2, "0")}:00h</span>
                </div>

                <input
                    type="range"
                    min="0"
                    max="23"
                    value={hour}
                    onChange={(e) => updateTimelineUrl(day, parseInt(e.target.value, 10))}
                    className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>
        </div>
    );
}