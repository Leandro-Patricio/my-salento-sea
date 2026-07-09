"use client";

import { fromLonLat } from "ol/proj";
import { useMap } from "../OpenLayerMap/MapContext";
import { useState } from "react";



export default function RightMenu()
{
    const { mapRef, points, windowSize } = useMap();
    const [rightMenuOpen, setRightMenuOpen] = useState(false);

    const handleFlyTo = (coords: number[]) =>
    {
        const map = mapRef.current;
        if (!map) return;

        // Acessa a View do OpenLayers e faz uma animação fluida de transição
        map.getView().animate({
            center: fromLonLat(coords),
            zoom: 12,
            duration: 1000, // 1 segundo de animação

        });
    };

    const maxMenuSize = windowSize === 'mobile' ? "w-60" : "w-80"; // Ajusta o tamanho máximo do menu com base no tamanho da janela

    return (
        <div className={`fixed top-5 right-0 z-100  overflow-hidden 
        flex  items-start justify-start gap-0 
        ${maxMenuSize}
        ${rightMenuOpen ? "translate-x-0" : "translate-x-[calc(100%-2.5rem)]"}
        transition-all duration-300 
        `}>

            <button
                onClick={() => setRightMenuOpen(!rightMenuOpen)}
                className={`w-6 h-6 p-5 flex items-center justify-center
                top-0 right-0 z-50  shadow-lg rounded-[1rem_0_0_1rem] bg-[#1A596A]`}
            >

                <div className={`w-4 h-4 transition-all duration-300
                text-slate-100 font-bold flex items-center justify-center
                ${rightMenuOpen ? "rotate-0" : "rotate-180"}`}>
                    &gt;
                </div>
            </button>



            <div className={`w-full h-full  rounded-[0_0_0_1rem]   shadow-lg border border-slate-200      bg-[#AFEEEE]`}>

                <div className="w-full bg-white p-4 shadow-lg border border-slate-200 flex flex-col gap-2">
                    <h2 className="font-bold text-slate-800 mb-2">Controles do Salento</h2>
                    {points.map((point, index) => (
                        <button
                            key={index}
                            onClick={() => handleFlyTo(point.coords)}
                            className="w-full bg-slate-50 hover:bg-blue-5 text-slate-700 hover:text-blue-600 text-left text-sm py-2 px-3 rounded-lg border border-slate-200 hover:border-blue-200 transition-all font-medium"
                        >
                            Ir para {point.name}
                        </button>
                    ))}
                </div>
            </div>
        </div >
    );
}
