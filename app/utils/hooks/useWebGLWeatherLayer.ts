import { useEffect, useRef } from "react";
import WebGLTileLayer from "ol/layer/WebGLTile";
import DataTileSource from "ol/source/DataTile";
import MapBrowserEvent from "ol/MapBrowserEvent";
import { useMap } from "@/app/components/MainMapPage/Contexts/MapContext";
import { METRIC_STYLES, MetricType } from "../constants/Scales";
import { fillTileDataWithReprojection } from "../functions/fillTileDataWithReprojection";
import { DailySliceResponse } from "../types/weatherGrid";
import { transform } from "ol/proj";

export interface WeatherHoverData
{
    value: number;
    lat: number;
    lon: number;
    pixel: [number, number];
}

interface UseWebGLWeatherLayerParams
{
    extent3857: number[] | null;
    extent4326: number[] | null;
    dimensions: { lons: number; lats: number } | null;
    dailyData: DailySliceResponse | null;
    day: number;
    hour: number;
    metric: MetricType;
    zIndex?: number;
    onHover: (data: WeatherHoverData | null) => void; // 🎯 Callback adicionado
}


export function useWebGLWeatherLayer({
    extent3857,
    extent4326,
    dimensions,
    dailyData,
    day,
    hour,
    metric,
    zIndex = 1,
    onHover
}: UseWebGLWeatherLayerParams)
{
    const { mapRef, isMapReady } = useMap();

    const tileSourceRef = useRef<DataTileSource | null>(null);
    const webglLayerRef = useRef<WebGLTileLayer | null>(null);
    const gridDataRef = useRef<Float32Array | null>(null);

    const activeExtent3857Ref = useRef<number[] | null>(null);
    const activeExtent4326Ref = useRef<number[] | null>(null);
    const activeDimensionsRef = useRef<{ lons: number; lats: number } | null>(null);

    // 🎯 Tipagem estrita da referência de estado interno
    const stateRef = useRef<{
        day: number;
        hour: number;
        metric: MetricType;
        dailyData: DailySliceResponse | null;
    }>({ day, hour, metric, dailyData });

    useEffect(() =>
    {
        activeExtent3857Ref.current = extent3857;
        activeExtent4326Ref.current = extent4326;
        activeDimensionsRef.current = dimensions;
        stateRef.current = { day, hour, metric, dailyData };
    }, [extent3857, extent4326, dimensions, day, hour, metric, dailyData]);

    const lons = dimensions?.lons;
    const lats = dimensions?.lats;

    // 1. CRIAÇÃO DA CAMADA
    useEffect(() =>
    {
        const map = mapRef.current;
        if (!map || !isMapReady) return;

        // Se os dados de grid ainda não carregaram, registramos o ouvinte de qualquer forma,
        // pois as referências internas (Refs) serão atualizadas assim que o dado chegar.
        const tileWidth = 256;
        const tileHeight = 256;

        const dataTileSource: DataTileSource = new DataTileSource({
            loader: (z, x, y): Float32Array =>
            {
                const tileGrid = dataTileSource.getTileGrid();
                const tileData = new Float32Array(tileWidth * tileHeight);
                if (!tileGrid) return tileData;

                const activeExtent3857 = activeExtent3857Ref.current;
                const activeExtent4326 = activeExtent4326Ref.current;
                const activeDimensions = activeDimensionsRef.current;
                const gridData = gridDataRef.current;

                if (!activeExtent3857 || !activeExtent4326 || !activeDimensions || !gridData)
                {
                    return tileData;
                }

                const tileExtent = tileGrid.getTileCoordExtent([z, x, y]);

                // 🎯 LOG DE INVESTIGAÇÃO:
                // Queremos ver se o loader entra no 'overlaps' ou se ele é descartado de cara
                const overlaps = (
                    tileExtent[0] < activeExtent3857[2] && tileExtent[2] > activeExtent3857[0] &&
                    tileExtent[1] < activeExtent3857[3] && tileExtent[3] > activeExtent3857[1]
                );

                if (z === 8 || z === 9)
                { // Níveis de zoom onde costuma dar o problema
                    console.log(`[Zoom ${z}] Tile: ${x},${y} | Overlaps: ${overlaps} | Extent Tile: [${tileExtent.map(n => Math.round(n))}] | Extent Ativo: [${activeExtent3857.map(n => Math.round(n))}]`);
                }

                if (!overlaps) return tileData;

                return fillTileDataWithReprojection({
                    tileExtent,
                    tileWidth,
                    tileHeight,
                    activeExtent3857,
                    activeExtent4326,
                    activeDimensions,
                    gridData
                });
            },
            tileSize: [tileWidth, tileHeight],
            bandCount: 1,
            projection: "EPSG:3857",
            wrapX: false,
            // 🎯 Força o OpenLayers a calcular as transições de zoom com base na View ativa do seu mapa
            tileGrid: map.getView().getProjection().getExtent()
                ? undefined // Deixa o OpenLayers usar o grid padrão da projeção global
                : undefined
        });
        tileSourceRef.current = dataTileSource;

        // 2. Criamos a camada WebGL
        const webglLayer = new WebGLTileLayer({
            source: dataTileSource,
            style: METRIC_STYLES[metric],
            // 🎯 REMOVIDO: 'extent: extent3857 || undefined'
            // Remover isso evita o clipping (corte de renderização) agressivo que faz a camada sumir no zoom.
            zIndex
        });
        webglLayerRef.current = webglLayer;
        map.addLayer(webglLayer);

        // EVENTO DE HOVER SEGURO
        const handlePointerMove = (evt: MapBrowserEvent<PointerEvent>) =>
        {
            const coord = evt.coordinate;
            const activeExtent = activeExtent3857Ref.current;
            const activeDimensions = activeDimensionsRef.current;
            const { dailyData: currentData, metric: activeMetric, hour: activeHour } = stateRef.current;

            // Coleta o evento de mouse do navegador para obter as coordenadas na viewport da tela
            const nativeEvent = evt.originalEvent;

            if (!activeExtent || !activeDimensions || !currentData || !nativeEvent)
            {
                onHover(null);
                return;
            }

            if (
                coord[0] >= activeExtent[0] && coord[0] <= activeExtent[2] &&
                coord[1] >= activeExtent[1] && coord[1] <= activeExtent[3]
            )
            {
                const rawMetrics = currentData.metrics[activeMetric];
                if (!rawMetrics)
                {
                    onHover(null);
                    return;
                }

                const coord4326 = transform(coord, "EPSG:3857", "EPSG:4326");
                const lon = coord4326[0];
                const lat = coord4326[1];

                const lonPct = (coord[0] - activeExtent[0]) / (activeExtent[2] - activeExtent[0]);
                const latPct = (coord[1] - activeExtent[1]) / (activeExtent[3] - activeExtent[1]);

                const xIdx = Math.min(Math.floor(lonPct * activeDimensions.lons), activeDimensions.lons - 1);
                const yIdx = Math.min(Math.floor(latPct * activeDimensions.lats), activeDimensions.lats - 1);

                const hourOffset = activeHour * activeDimensions.lats * activeDimensions.lons;
                const dataIndex = hourOffset + (yIdx * activeDimensions.lons) + xIdx;

                const val = rawMetrics[dataIndex];
                if (val !== undefined && !isNaN(val) && val < 10000000000)
                {
                    let processedVal = val;
                    if (activeMetric === "temperature" && processedVal > 100)
                    {
                        processedVal -= 273.15;
                    }

                    onHover({
                        value: processedVal,
                        lat,
                        lon,
                        pixel: [nativeEvent.clientX, nativeEvent.clientY]
                    });
                } else
                {
                    onHover(null);
                }
            } else
            {
                onHover(null);
            }
        };

        // 2. Para registrar no OL de forma limpa, fazemos o cast do handler para uma função de assinatura genérica do OpenLayers
        const eventType = "pointermove";
        const listener = handlePointerMove as (evt: import("ol/events/Event").default) => void;

        map.on(eventType, listener);

        return () =>
        {
            map.removeLayer(webglLayer);
            map.un(eventType, listener);
            tileSourceRef.current = null;
            webglLayerRef.current = null;
        };
        // 🎯 Removido dependências estritas de dados brutos que travavam o registro do evento
    }, [mapRef, isMapReady, zIndex]);

    // 2. ATUALIZAÇÃO DA TEXTURA WEBGL
    useEffect(() =>
    {
        const updateLayerState = () =>
        {
            if (!dailyData || !tileSourceRef.current || !webglLayerRef.current || !lons || !lats) return;

            console.log("🔄 [Efeito Atualização] Executando updateLayerState. O tileSource está sendo resetado!");

            const rawMetrics = dailyData.metrics[metric];
            if (!rawMetrics) return;

            const flatData = new Float32Array(lons * lats);
            const hourOffset = hour * lats * lons;
            let index = 0;

            for (let y = 0; y < lats; y++)
            {
                for (let x = 0; x < lons; x++)
                {
                    const dataIndex = hourOffset + (y * lons) + x;
                    let val = rawMetrics[dataIndex];

                    if (val === undefined || isNaN(val) || val > 10000000000) val = 0;
                    if (metric === "temperature" && val > 100) val -= 273.15;
                    flatData[index++] = val;
                }
            }

            gridDataRef.current = flatData;

            webglLayerRef.current.setStyle(METRIC_STYLES[metric]);

            tileSourceRef.current.clear();
            tileSourceRef.current.refresh();

            // 🎯 Força o OpenLayers a recalcular e redesenhar os buffers WebGL imediatamente
            mapRef.current?.render();

            if (extent3857)
            {
                webglLayerRef.current.setExtent(extent3857);
            }
            webglLayerRef.current.setStyle(METRIC_STYLES[metric]);

            tileSourceRef.current.clear();
            tileSourceRef.current.refresh();
            tileSourceRef.current.changed();
            mapRef.current?.render();
        };

        updateLayerState();
    }, [dailyData, hour, metric, extent3857, lons, lats, mapRef]);
}