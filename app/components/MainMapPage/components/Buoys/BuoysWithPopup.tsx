"use client";

import { useEffect } from "react";
import { useMap } from "../../Contexts/MapContext";
import { buoyConfig } from "./components/buoyConfig";
import SingleBuoy from "./components/SingleBuoy";


export default function BuoysComponent()
{
    const { mapRef, points, isMapReady, windowSize, activeTileLayer } = useMap();

    useEffect(() =>
    {
        const map = mapRef.current;
        if (!map || !isMapReady) return;

        // Desenha os ícones das boias no mapa
        const buoyLayer = buoyConfig({ map, points, windowSize, activeTileLayer });

        return () => { if (map) map.removeLayer(buoyLayer); };
    }, [isMapReady, points, mapRef, windowSize]);

    if (!isMapReady) return null;

    return (
        <>
            {points.map((buoy) => (
                <SingleBuoy
                    key={buoy.name}
                    buoy={buoy}
                />
            ))}
        </>
    );
}