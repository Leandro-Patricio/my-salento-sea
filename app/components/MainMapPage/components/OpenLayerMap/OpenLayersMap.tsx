"use client";

import { useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, transformExtent } from "ol/proj";
import { useMap } from "./MapContext"; // Importa o hook
import { defaults as defaultControls } from "ol/control";
import Zoom from "ol/control/Zoom";


export default function OpenLayersMap()
{
    const mapElement = useRef<HTMLDivElement>(null);
    const { setMap, clearMap, windowSize } = useMap(); // Pega as funções do contexto

    useEffect(() =>
    {
        if (!mapElement.current) return;

        const getInitialZoom = (): number =>
        {
            if (windowSize === 'desktop') return 9  // 💻 Desktops - Zoom mais próximo e detalhado (Default)
            if (windowSize === 'mobile') return 7// 📱 Telas pequenas (Mobile) - Zoom mais afastado para ver tudo
            if (windowSize === 'tablet') return 8

            return 9;    // Fallback para qualquer outro caso               
        };

        const map = new Map({
            target: mapElement.current,
            layers: [
                new TileLayer({ source: new OSM() }),
            ],
            controls: defaultControls({ zoom: false }).extend([
                new Zoom({
                    // Classes do Tailwind para posicionar no canto superior direito
                    className: "my-custom-zoom"
                })
            ]),

            view: new View({
                center: fromLonLat([18.20, 40.15]), // Centro do Salento
                zoom: getInitialZoom(),       // Zoom inicial
                minZoom: 9,     // Limite máximo de "zoom out" (afastar) - não deixa ver o mundo todo
                maxZoom: 14,    // Limite máximo de "zoom in" (aproximar) - bom para não estourar os tiles brutos

                extent: SALENTO_EXTENT, // 🔥 Trava o movimento do mapa estritamente dentro deste quadrante
                smoothExtentConstraint: true // Deixa o efeito de "mola" mais suave quando bate na borda do limite
            }),
        });

        // Salva a instância no Contexto global
        setMap(map);

        return () =>
        {
            map.setTarget(undefined);
            clearMap(); // Limpa ao desmontar
        };
    }, []);

    return (
        <div className="w-full h-full">
            <div ref={mapElement} className="w-full h-full" />
        </div>
    );
}



const SALENTO_EXTENT = transformExtent(
    [15.90, 38.70, 19.60, 42.65], // [Longitude Mínima, Latitude Mínima, Longitude Máxima, Latitude Máxima]
    "EPSG:4326",
    "EPSG:3857"
);
