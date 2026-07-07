"use client";

import { createContext, useContext, useRef, ReactNode, useState } from "react";
import Map from "ol/Map";
import { Buoys } from "@/app/types/buoys";

interface MapContextType
{
    mapRef: React.RefObject<Map | null>;
    setMap: (map: Map) => void;
    clearMap: () => void;
    isMapReady?: boolean;
    points: Buoys
}

const MapContext = createContext<MapContextType | undefined>(undefined);


type MapProviderProps = {
    children: ReactNode;
    points: Buoys
};

export function MapProvider({ children, points }: MapProviderProps)
{
    const [isMapReady, setIsMapReady] = useState(false);

    const mapRef = useRef<Map | null>(null);
    const setMap = (map: Map) =>
    {
        mapRef.current = map;
        setIsMapReady(true);
    };

    const clearMap = () =>
    {
        mapRef.current = null;
        setIsMapReady(false);
    };


    return (
        <MapContext.Provider value={{ mapRef, setMap, clearMap, points, isMapReady }}>
            {children}
        </MapContext.Provider>
    );
}

export function useMap()
{
    const context = useContext(MapContext);
    if (!context)
    {
        throw new Error("useMap deve ser usado dentro de um MapProvider");
    }
    return context;
}