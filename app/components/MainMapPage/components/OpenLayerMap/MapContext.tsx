"use client";

import { createContext, useContext, useRef, ReactNode, useState, useEffect, useMemo } from "react";
import Map from "ol/Map";
import { Buoys } from "@/app/types/buoys";
import { tileLayerType, windowSizeType } from "@/app/types/diverse";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";

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
    setActiveTileLayer: React.Dispatch<React.SetStateAction<tileLayerType>>
}

const MapContext = createContext<MapContextType | undefined>(undefined);


type MapProviderProps = {
    children: ReactNode;
    points: Buoys
};

export function MapProvider({ children, points }: MapProviderProps)
{
    const [isMapReady, setIsMapReady] = useState(false);
    const [windowSize, setWindowSize] = useState<windowSizeType>('desktop');
    const [activeTileLayer, setActiveTileLayer] = useState<tileLayerType>("osm");

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


    const changeBasemap = (url: tileLayerType) =>
    {
        const map = mapRef.current;
        if (!map) return;

        const layers = map.getLayers().getArray();
        if (layers.length > 0 && layers[0] instanceof TileLayer)
        {
            layers[0].setSource(new XYZ({ url }));
        }
    };

    const contextValue = useMemo(() => ({
        mapRef,
        setMap,
        clearMap,
        points,
        isMapReady,
        windowSize,
        changeBasemap,
        activeTileLayer, setActiveTileLayer
    }), [
        // Coloque aqui TUDO o que é estado ou prop mutável
        points,
        isMapReady,
        windowSize,
        activeTileLayer
        // Nota: mapRef, setMap e clearMap são referências/funções estáveis, 
        // então não precisam (e não devem) entrar aqui porque a referência delas nunca muda.
    ]);

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