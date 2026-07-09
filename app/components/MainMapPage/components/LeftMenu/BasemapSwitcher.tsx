"use client";

import { useState, useEffect, useRef } from "react";
import { useMap } from "../OpenLayerMap/MapContext";
import Link from "next/link";
import { basemaps } from "@/app/utils/constants/BaseTyleLayers";




export default function BasemapSwitcher()
{
    const { activeTileLayer } = useMap();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Fecha o menu se clicar em qualquer outro lugar da tela
    useEffect(() =>
    {
        const handleClickOutside = (event: MouseEvent) =>
        {
            if (containerRef.current && !containerRef.current.contains(event.target as Node))
                setIsOpen(false);
        };

        if (isOpen)
            document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Filtramos para saber qual é o mapa que está ativo no momento
    const activeMap = basemaps.find((m) => m.id === activeTileLayer) || basemaps[0];
    // Pegamos as outras opções que vão subir ao abrir o menu
    const otherMaps = basemaps.filter((m) => m.id !== activeTileLayer);

    return (
        <div
            ref={containerRef}
            className="fixed bottom-28 left-5 z-100 flex flex-col-reverse items-center gap-3"
        >
            {/* 🟢 CÍRCULO PRINCIPAL (ATIVO) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-10 h-10 rounded-lg border-2 border-white shadow-xl flex items-center justify-center 
                    cursor-pointer transform active:scale-95 transition-all duration-300 relative overflow-hidden bg-cover bg-center
                     ${isOpen ? "ring-4 ring-blue-500/30" : ""}`}
                style={{ backgroundImage: `url(${activeMap.imagePath})` }}
                title={activeMap.name}
            >
                {/* Overlay discreto com texto ou ícone se a imagem for muito escura */}
                <span className="absolute bottom-1 text-[9px] font-bold px-1 bg-white/80 rounded backdrop-blur-xs text-slate-700 pointer-events-none uppercase">
                    {activeMap.id}
                </span>
            </button>

            {/* 🟡 CÍRCULOS SECUNDÁRIOS (SÓ SUBEM SE ISOPEN FOR TRUE) */}
            <div className="flex flex-col gap-3 items-center">
                {otherMaps.map((m, index) => (
                    <Link
                        href={`?basemap=${m.id}`}
                        key={m.id}
                        onClick={() => setIsOpen(false)}
                        // Lógica de transição: se fechado, encolhe (scale-0), fica invisível (opacity-0) e desce para baixo do botão principal
                        className={`w-9 h-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center 
                            cursor-pointer transition-all duration-300 transform bg-cover bg-center relative overflow-hidden
                            ${isOpen
                                ? "scale-100 opacity-100 translate-y-0"
                                : "scale-0 opacity-0 translate-y-10 pointer-events-none"
                            }`}
                        // Efeito cascata suave de subida baseado no índice do elemento
                        style={{
                            transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                            backgroundImage: `url('${m.imagePath}')`
                        }}
                        title={m.name}
                    >
                        <span className="absolute bottom-1 text-[8px] font-bold px-1 bg-white/80 rounded text-slate-700 uppercase">
                            {m.id}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
