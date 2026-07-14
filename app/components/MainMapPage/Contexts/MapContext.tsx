"use client";

import { createContext, useContext, useRef, ReactNode, useState, useEffect, useMemo, RefObject, useCallback } from "react";
import Map from "ol/Map";
import { Buoys } from "@/app/utils/types/buoys";
import { windowSizeType } from "@/app/utils/types/diverse";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import useUpdateActiveTileLayer from "@/app/utils/hooks/useUpdateActiveTileLayer";
import { defaultBasemap, tileLayerType } from "@/app/utils/constants/BaseTyleLayers";

interface MapContextType
{
    mapRef: React.RefObject<Map | null>;
    setMap: (map: Map) => void;
    clearMap: () => void;
    isMapReady?: boolean;
    points: Buoys
    windowSize: windowSizeType
    changeBasemap: (url: tileLayerType) => void

    activeTileLayer: tileLayerType
}

const MapContext = createContext<MapContextType | undefined>(undefined);


type MapProviderProps = {
    children: ReactNode;
    points: Buoys
    initialBasemap: tileLayerType
};

export function MapProvider({ children, points, initialBasemap }: MapProviderProps)
{
    const [isMapReady, setIsMapReady] = useState(false);
    const [windowSize, setWindowSize] = useState<windowSizeType>('desktop');
    const mapRef = useRef<Map | null>(null);
    const [activeTileLayer, setActiveTileLayer] = useState<tileLayerType>(initialBasemap || defaultBasemap);

    useUpdateActiveTileLayer({ initialBasemap, isMapReady, mapRef, activeTileLayer, setActiveTileLayer });


    useEffect(() =>
    { // Atualiza o estado do tamanho da janela quando o componente é montado e quando a janela é redimensionada
        if (typeof window === "undefined") return

        const handleResize = () =>
        {
            const width = window.innerWidth;
            if (width < 640) setWindowSize('mobile');
            else if (width < 1024) setWindowSize('tablet');
            else setWindowSize('desktop');
        };

        // Escuta o redimensionamento e a rotação do celular
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);


    const setMap = useCallback((map: Map) =>
    {
        mapRef.current = map;
        setIsMapReady(true);
    }, []);

    // 🎯 MEMORIZAÇÃO: clearMap agora possui a mesma referência de memória para sempre
    const clearMap = useCallback(() =>
    {
        mapRef.current = null;
        setIsMapReady(false);
    }, []);

    // 🎯 MEMORIZAÇÃO: changeBasemap agora possui a mesma referência de memória para sempre
    const changeBasemap = useCallback((url: tileLayerType) =>
    {
        const map = mapRef.current;
        if (!map) return;

        const layers = map.getLayers().getArray();
        if (layers.length > 0 && layers[0] instanceof TileLayer)
        {
            layers[0].setSource(new XYZ({ url }));
        }
    }, []);

    const contextValue = useMemo(() => ({
        mapRef,
        setMap,
        clearMap,
        points,
        isMapReady,
        windowSize,
        changeBasemap,
        activeTileLayer,
    }), [setMap, clearMap, points, isMapReady, windowSize, changeBasemap, activeTileLayer]);

    return (
        <MapContext.Provider value={contextValue}>
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