"use client";

import { useEffect, useRef } from "react";
// import { useMapContext } from "@/app/context/MapContext"; // Seu contexto do OpenLayers para pegar a instância do mapa
import Overlay from "ol/Overlay";
import { toLonLat } from "ol/proj";
import { useMap } from "../../Contexts/MapContext";

interface GridDataProps
{
    gridData: {
        lats: number[];
        lons: number[];
        grid: number[][];
    };
}

export default function DataLayerFromStream({ gridData }: GridDataProps)
{
    const { mapRef } = useMap();

    const dataRef = useRef(gridData);
    const overlayRef = useRef<Overlay | null>(null);

    useEffect(() =>
    {
        if (!mapRef.current) return;
        dataRef.current = gridData; // Atualiza a referência sempre que o stream renovar os dados

        // 1. Cria o elemento do popup de hover que seguirá o mouse
        const popupElement = document.getElementById("map-hover-popup");
        if (popupElement)
        {
            overlayRef.current = new Overlay({
                element: popupElement,
                positioning: "bottom-center",
                stopEvent: false,
            });
            mapRef.current.addOverlay(overlayRef.current);
        }

        // 2. Escuta o movimento do mouse no mapa
        const handlePointerMove = (event: any) =>
        {
            const coordinate = event.coordinate;
            const [lon, lat] = toLonLat(coordinate); // Transforma em coordenadas geográficas

            const { lats, lons, grid } = dataRef.current;

            // Verifica se o mouse está dentro das delimitações da grade recortada
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLon = Math.min(...lons);
            const maxLon = Math.max(...lons);

            if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon)
            {
                // 🎯 MATEMÁTICA DE PROXIMIDADE: Acha o índice mais próximo nos arrays ordenados de lat/lon
                const latIndex = lats.reduce((closestIdx, currentLat, idx, arr) =>
                    Math.abs(currentLat - lat) < Math.abs(arr[closestIdx] - lat) ? idx : closestIdx, 0
                );

                const lonIndex = lons.reduce((closestIdx, currentLon, idx, arr) =>
                    Math.abs(currentLon - lon) < Math.abs(arr[closestIdx] - lon) ? idx : closestIdx, 0
                );

                // Busca o valor na matriz na velocidade da luz (0.001ms)
                const value = grid[latIndex]?.[lonIndex];

                if (value !== undefined && popupElement)
                {
                    popupElement.innerHTML = `<strong>Valor:</strong> ${value.toFixed(2)}`;
                    overlayRef.current?.setPosition(coordinate);
                    popupElement.style.display = "block";
                    return;
                }
            }

            if (popupElement) popupElement.style.display = "none";
        };

        mapRef.current.on("pointermove", handlePointerMove);

        return () =>
        {
            mapRef.current?.un("pointermove", handlePointerMove);
            if (overlayRef.current) mapRef.current?.removeOverlay(overlayRef.current);
        };
    }, [mapRef, gridData]);

    return (
        <div
            id="map-hover-popup"
            className="absolute bg-slate-950/90 text-white text-xs px-2 py-1 rounded border border-slate-700 pointer-events-none hidden shadow-md z-50"
        />
    );
}