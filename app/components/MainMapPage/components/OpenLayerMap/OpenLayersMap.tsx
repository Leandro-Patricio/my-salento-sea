"use client";

import { useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import { useMap } from "../../Contexts/MapContext";
import { defaults as defaultControls } from "ol/control";
import Zoom from "ol/control/Zoom";

export default function OpenLayersMap()
{
    const mapElement = useRef<HTMLDivElement>(null);
    const { setMap, clearMap, windowSize } = useMap();

    // 🎯 INICIALIZAÇÃO ÚNICA: Cria a instância física do mapa e entrega ao contexto
    useEffect(() =>
    {
        if (!mapElement.current) return;

        // Ajuste fino do zoom inicial conforme o dispositivo
        const getInitialZoom = () =>
        {
            if (windowSize === 'desktop') return 9;
            if (windowSize === 'mobile') return 7;
            return 8;
        };

        const map = new Map({
            target: mapElement.current,
            layers: [
                new TileLayer({
                    source: new OSM()
                }),
            ],
            controls: defaultControls({ zoom: false }).extend([
                new Zoom({ className: "my-custom-zoom" })
            ]),
            view: new View({
                center: fromLonLat([18.20, 40.15]), // Centralizado no Salento
                zoom: getInitialZoom(),
                smoothExtentConstraint: true
            }),
        });

        // Compartilha a instância do mapa com o resto da aplicação
        setMap(map);

        return () =>
        {
            map.setTarget(undefined);
            clearMap();
        };
    }, [windowSize, setMap, clearMap]); // Só roda se o tamanho da tela mudar (redimensionamento crítico)

    return (
        <div className="w-full h-full">
            <div ref={mapElement} className="w-full h-full" />
        </div>
    );
}