"use client";

import { useEffect, useRef, useState } from "react";
import Overlay from "ol/Overlay";
import LineString from "ol/geom/LineString";
import Feature from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Stroke, Style } from "ol/style";
import MapBrowserEvent from "ol/MapBrowserEvent";
import { fromLonLat } from "ol/proj";
import { unByKey } from "ol/Observable";
import { EventsKey } from "ol/events";
import { useMap } from "../../../Contexts/MapContext";
import { Buoy } from "./buoyConfig";


interface SingleBuoyProps
{
    buoy: Buoy;
}

export default function SingleBuoy({ buoy }: SingleBuoyProps)
{
    const { mapRef, activeTileLayer } = useMap();
    const anchorElementRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    const overlayRef = useRef<Overlay | null>(null);
    const buoyCoordsRef = useRef<number[]>(fromLonLat(buoy.coords));

    // Referências locais para gerenciar a linha exclusiva desta boia
    const lineLayerRef = useRef<VectorLayer | null>(null);
    const lineFeatureRef = useRef<Feature<LineString> | null>(null);

    useEffect(() =>
    {
        const map = mapRef.current;
        if (!map || !anchorElementRef.current) return;

        // 1. Configura o Overlay fixado na coordenada da boia
        const overlay = new Overlay({
            element: anchorElementRef.current,
            stopEvent: true,
            positioning: "center-center",
        });
        map.addOverlay(overlay);
        overlayRef.current = overlay;
        overlay.setPosition(buoyCoordsRef.current);

        // 2. Escuta cliques para abrir o popup se for esta boia
        const handleMapClick = (event: MapBrowserEvent) =>
        {
            const feature = map.forEachFeatureAtPixel(event.pixel, (feat) => feat, { hitTolerance: 10 });

            if (feature)
            {
                const data = feature.getProperties().buoyData as Buoy;

                if (data.name === buoy.name)
                {
                    setIsOpen(true);

                    // Se o popup abriu e a camada de linha ainda não existe, cria ela agora
                    if (!lineLayerRef.current)
                    {
                        const lineGeom = new LineString([buoyCoordsRef.current, buoyCoordsRef.current]);
                        const lineFeature = new Feature(lineGeom);

                        const lineSource = new VectorSource({ features: [lineFeature] });
                        const lineLayer = new VectorLayer({
                            source: lineSource,
                            zIndex: 40,
                            style: new Style({
                                stroke: new Stroke({ color: "#2563eb", width: 2, lineDash: [4, 4] }),
                            }),
                        });

                        map.addLayer(lineLayer);

                        // Guarda as referências para atualizar no arrasto e limpar depois
                        lineLayerRef.current = lineLayer;
                        lineFeatureRef.current = lineFeature;
                    }
                }
            }
        };

        const clickKey: EventsKey = map.on("singleclick", handleMapClick);

        return () =>
        {
            if (map)
            {
                map.removeOverlay(overlay);
                unByKey(clickKey);
                if (lineLayerRef.current) map.removeLayer(lineLayerRef.current);
            }
        };
    }, [mapRef, buoy]);

    // ==========================================
    // Lógica do Drag
    // ==========================================
    const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) =>
    {
        const map = mapRef.current;
        const overlay = overlayRef.current;
        if (!map || !overlay) return;

        const dragHandle = e.currentTarget;
        dragHandle.setPointerCapture(e.pointerId);

        // 1. Pega o pixel geográfico atual do overlay (o centro dele)
        const currentPosition = overlay.getPosition();
        if (!currentPosition) return;
        const overlayPixel = map.getPixelFromCoordinate(currentPosition);

        // 2. Pega o pixel de onde o mouse clicou na tela
        const clickPixel = map.getEventPixel(e.nativeEvent);

        // 3. Calcula a diferença (offset) entre o clique do mouse e o centro do card
        const offsetX = overlayPixel[0] - clickPixel[0];
        const offsetY = overlayPixel[1] - clickPixel[1];

        const onPointerMove = (moveEvent: PointerEvent) =>
        {
            moveEvent.preventDefault(); // Evita seleção de texto ou outros efeitos indesejados
            // Pega a posição atual do mouse
            const currentMousePixel = map.getEventPixel(moveEvent);

            // Aplica o offset para que o centro do card não pule para o cursor
            const adjustedPixel = [
                currentMousePixel[0] + offsetX,
                currentMousePixel[1] + offsetY
            ];

            // Transforma o pixel ajustado de volta para coordenada geográfica
            const coord = map.getCoordinateFromPixel(adjustedPixel);

            if (coord)
            {
                overlay.setPosition(coord);
                // Atualiza a linha do ponteiro
                lineFeatureRef.current?.getGeometry()?.setCoordinates([buoyCoordsRef.current, coord]);
            }
        };

        const onPointerUp = (upEvent: PointerEvent) =>
        {
            try
            {
                dragHandle.releasePointerCapture(upEvent.pointerId);
            } catch (err)
            {
                console.warn("Erro ao liberar pointer capture:", err);
            }
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", onPointerUp);
    };

    const handleClose = () =>
    {
        const map = mapRef.current;
        setIsOpen(false);

        // Reseta o posicionamento e remove a camada da linha do mapa
        overlayRef.current?.setPosition(buoyCoordsRef.current);
        if (map && lineLayerRef.current)
        {
            map.removeLayer(lineLayerRef.current);
            lineLayerRef.current = null;
            lineFeatureRef.current = null;
        }
    };

    return (
        <div ref={anchorElementRef} className={` ${isOpen ? "absolute" : "hidden"}`}>
            <div
                className="bg-white rounded-xl shadow-2xl border border-slate-100 min-w-60 z-50 
                        select-none overflow-hidden animate-in fade-in-50"
                style={{
                    transform: "translate(-50%, -50%)",
                    touchAction: "none", // Evita que o navegador interprete gestos de toque como scroll ou zoom
                }}
            >
                {/* BARRA DE ARRASTO */}
                <div
                    onPointerDown={handleDragStart}
                    className="bg-slate-50 border-b border-slate-100 
                    px-4 py-2 flex justify-between items-center cursor-grab 
                    active:cursor-grabbing text-slate-500
                    touch-none
                    "
                >
                    <span className="text-xs font-bold uppercase tracking-wider">
                        {buoy.name}
                    </span>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* CORPO DO POPUP */}
                <div className="p-4" onPointerDown={(e) => e.stopPropagation()}>
                    <h3 className="font-bold text-slate-800 text-base leading-tight mb-1">
                        {buoy.name}
                    </h3>
                    <p className="text-xs text-blue-600 font-semibold mb-3">Monitoramento Conectado</p>
                    <div className="w-full h-24 bg-slate-50 border border-dashed border-slate-200 rounded flex items-center justify-center text-xs text-slate-400">
                        [Gráfico]
                    </div>
                </div>
            </div>
        </div>
    );
}