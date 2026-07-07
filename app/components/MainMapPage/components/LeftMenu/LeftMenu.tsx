"use client";

import { fromLonLat } from "ol/proj";
import { useMap } from "../OpenLayerMap/MapContext";
import Link from "next/link";
import Image from "next/image";



export default function LeftMenu()
{
    const { mapRef, points } = useMap();

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

    return (
        <div className="absolute top-0 left-0 z-100 max-h-[calc(100%-32px)] overflow-y-auto">

            <Link href="./" className="w-fit h-fit p-5 flex items-center justify-center">
                <Image
                    src="/Logos/Logo.svg"
                    alt="Logo"
                    width={500}
                    height={500}
                    className="w-20 h-auto"
                    priority
                />
            </Link>

            <div className="w-44 bg-white p-4 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-2">
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
    );
}