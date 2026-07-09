"use client";

import { useState, useEffect, useRef } from "react";
import { useMap } from "../OpenLayerMap/MapContext";
import { tileLayerType } from "@/app/types/diverse";

// Definindo estritamente as opções com a propriedade de imagem que você vai alimentar
interface BasemapOption
{
    id: "osm" | "esri" | "dark";
    name: string;
    url: string;
    bgClass: string; // Classe provisória para você injetar as imagens de fundo depois
}

const basemaps: BasemapOption[] = [
    {
        id: "osm",
        name: "Padrão (OSM)",
        url: "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        bgClass: "bg-slate-200" // Altere para bg-[url('/seu-caminho/osm.jpg')]
    },
    {
        id: "esri",
        name: "Satélite (Esri)",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        bgClass: "bg-emerald-200" // Altere para bg-[url('/seu-caminho/esri.jpg')]
    },
    {
        id: "dark",
        name: "Escuro",
        url: "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        bgClass: "bg-slate-800" // Altere para bg-[url('/seu-caminho/dark.jpg')]
    },
];

export default function BasemapSwitcher()
{
    const { changeBasemap, activeTileLayer, setActiveTileLayer } = useMap();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Fecha o menu se clicar em qualquer outro lugar da tela
    useEffect(() =>
    {
        const handleClickOutside = (event: MouseEvent) =>
        {
            if (containerRef.current && !containerRef.current.contains(event.target as Node))
            {
                setIsOpen(false);
            }
        };

        if (isOpen)
        {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleSelect = (id: tileLayerType, url: tileLayerType, e: React.MouseEvent) =>
    {
        e.stopPropagation(); // Impede que o clique feche o menu imediatamente
        setActiveTileLayer(id);
        changeBasemap(url);
        setIsOpen(false);
    };

    // Filtramos para saber qual é o mapa que está ativo no momento
    const activeMap = basemaps.find((m) => m.id === activeTileLayer) || basemaps[0];
    // Pegamos as outras opções que vão subir ao abrir o menu
    const otherMaps = basemaps.filter((m) => m.id !== activeTileLayer);

    return (
        <div
            ref={containerRef}
            className="fixed bottom-32 left-6 z-100 flex flex-col-reverse items-center gap-3"
        >
            {/* 🟢 CÍRCULO PRINCIPAL (ATIVO) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full border-2 border-white shadow-xl flex items-center justify-center 
                    cursor-pointer transform active:scale-95 transition-all duration-300 relative overflow-hidden bg-cover bg-center
                    ${activeMap.bgClass} ${isOpen ? "ring-4 ring-blue-500/30" : ""}`}
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
                    <button
                        key={m.id}
                        onClick={(e) => handleSelect(m.id, m.url as tileLayerType, e)}
                        // Lógica de transição: se fechado, encolhe (scale-0), fica invisível (opacity-0) e desce para baixo do botão principal
                        className={`w-12 h-12 rounded-full border-2 border-white shadow-lg flex items-center justify-center 
                            cursor-pointer transition-all duration-300 transform bg-cover bg-center relative overflow-hidden
                            ${m.bgClass}
                            ${isOpen
                                ? "scale-100 opacity-100 translate-y-0"
                                : "scale-0 opacity-0 translate-y-10 pointer-events-none"
                            }`}
                        // Efeito cascata suave de subida baseado no índice do elemento
                        style={{ transitionDelay: isOpen ? `${index * 50}ms` : "0ms" }}
                        title={m.name}
                    >
                        <span className="absolute bottom-1 text-[8px] font-bold px-1 bg-white/80 rounded text-slate-700 uppercase">
                            {m.id}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}