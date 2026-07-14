import { useEffect, useRef } from "react";
import WebGLTileLayer from "ol/layer/WebGLTile";
import DataTileSource from "ol/source/DataTile";
import MapBrowserEvent from "ol/MapBrowserEvent";
import { useMap } from "@/app/components/MainMapPage/Contexts/MapContext";
import { METRIC_STYLES, MetricType } from "../constants/Scales";
import { fillTileDataWithReprojection } from "../functions/fillTileDataWithReprojection";
import { DailySliceResponse } from "../types/weatherGrid";
import { transform } from "ol/proj";
import { createXYZ } from "ol/tilegrid";

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
    onHover: (data: WeatherHoverData | null) => void;
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

    const appliedMetricRef = useRef<MetricType | null>(null);

    const stateRef = useRef<{
        day: number;
        hour: number;
        metric: MetricType;
        dailyData: DailySliceResponse | null;
    }>({ day, hour, metric, dailyData });

    // Sincroniza referências
    useEffect(() =>
    {
        activeExtent3857Ref.current = extent3857;
        activeExtent4326Ref.current = extent4326;
        activeDimensionsRef.current = dimensions;
        stateRef.current = { day, hour, metric, dailyData };
    }, [extent3857, extent4326, dimensions, day, hour, metric, dailyData]);

    const lons = dimensions?.lons;
    const lats = dimensions?.lats;

    // 1. CRIAÇÃO DA CAMADA (Apenas se houver dados prontos para desenho)
    useEffect(() =>
    {
        const map = mapRef.current;
        if (!map || !isMapReady || !extent3857) return;

        // 🎯 EVITA FLICKER E ERROS DE BUFFER NA INICIALIZAÇÃO:
        // Só criamos a camada física do WebGL no mapa quando os dados do Grid 
        // já estiverem processados e disponíveis na referência de memória.
        if (!gridDataRef.current) return;

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

                return fillTileDataWithReprojection({
                    tileExtent: tileGrid.getTileCoordExtent([z, x, y]),
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
            interpolate: false,
            tileGrid: extent3857 ? createXYZ({
                extent: map.getView().getProjection().getExtent(), // Cobertura matemática global de zoom
                tileSize: [tileWidth, tileHeight]
            }) : undefined
        });
        tileSourceRef.current = dataTileSource;

        const webglLayer = new WebGLTileLayer({
            source: dataTileSource,
            style: METRIC_STYLES[metric],
            zIndex,
            preload: 1,
            cacheSize: 512,
            opacity: 0.99,
        });

        webglLayerRef.current = webglLayer;
        appliedMetricRef.current = metric;
        map.addLayer(webglLayer);

        // EVENTO DE HOVER SEGURO
        const handlePointerMove = (evt: MapBrowserEvent<PointerEvent>) =>
        {
            const coord = evt.coordinate;
            const activeExtent = activeExtent3857Ref.current;
            const activeDimensions = activeDimensionsRef.current;
            const { dailyData: currentData, metric: activeMetric, hour: activeHour } = stateRef.current;
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

        const eventType = "pointermove";
        const listener = handlePointerMove as (evt: import("ol/events/Event").default) => void;
        map.on(eventType, listener);

        return () =>
        {
            map.removeLayer(webglLayer);
            map.un(eventType, listener);
            tileSourceRef.current = null;
            webglLayerRef.current = null;
            appliedMetricRef.current = null;
        };
        // 🎯 Adicionado 'dailyData' e as resoluções para disparar o ciclo apenas quando o dado carregar de fato.
    }, [mapRef, isMapReady, zIndex, extent3857, dailyData, lons, lats]);

    // 2. PROCESSAMENTO E ATUALIZAÇÃO DA TEXTURA WEBGL
    useEffect(() =>
    {
        const updateLayerState = () =>
        {
            if (!dailyData || !lons || !lats) return;

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

            // 1. Primeiro atualizamos os dados brutos na referência
            gridDataRef.current = flatData;

            // 2. Se a camada já está ativa no mapa, atualizamos de forma suave na GPU
            if (webglLayerRef.current && tileSourceRef.current)
            {
                if (appliedMetricRef.current !== metric)
                {
                    webglLayerRef.current.setStyle(METRIC_STYLES[metric]);
                    appliedMetricRef.current = metric;
                }

                if (extent3857)
                {
                    webglLayerRef.current.setExtent(extent3857);
                }

                tileSourceRef.current.changed();
            }
        };

        updateLayerState();
    }, [dailyData, hour, metric, extent3857, lons, lats]);
}

const tileWidth = 256;
const tileHeight = 256;