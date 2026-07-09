"use client";

import { useEffect } from "react";
import { useMap } from "../OpenLayerMap/MapContext";
import { buoyConfig } from "./components/buoyConfig";
import SingleBuoy from "./components/SingleBuoy";


export default function Buoys()
{
    const { mapRef, points, isMapReady, windowSize } = useMap();

    useEffect(() =>
    {
        const map = mapRef.current;
        if (!map || !isMapReady) return;

        // Desenha os ícones das boias no mapa
        const buoyLayer = buoyConfig(map, points, windowSize);

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