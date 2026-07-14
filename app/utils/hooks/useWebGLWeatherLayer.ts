import { useEffect, useRef } from "react";
import WebGLTileLayer from "ol/layer/WebGLTile";
import DataTileSource from "ol/source/DataTile";
import MapBrowserEvent from "ol/MapBrowserEvent";
import { transform } from "ol/proj";
import { useMap } from "@/app/components/MainMapPage/Contexts/MapContext";
import { useWeatherData } from "@/app/components/MainMapPage/Contexts/WeatherDataContext";
import { METRIC_STYLES, MetricType } from "../constants/Scales";
import { fillTileDataWithReprojection } from "../functions/fillTileDataWithReprojection";


interface UseWebGLWeatherLayerParams
{
    extent3857: number[] | null;
    extent4326: number[] | null;
    dimensions: { lons: number; lats: number } | null;
    day: number;
    hour: number;
    metric: MetricType;
    zIndex?: number;
}

export function useWebGLWeatherLayer({
    extent3857,
    extent4326,
    dimensions,
    day,
    hour,
    metric,
    zIndex = 1
}: UseWebGLWeatherLayerParams)
{
    const { mapRef, isMapReady } = useMap();
    const { getOrFetchDay } = useWeatherData();

    const tileSourceRef = useRef<DataTileSource | null>(null);
    const webglLayerRef = useRef<WebGLTileLayer | null>(null);

    // 🎯 O CORAÇÃO DO DADO: Esta ref mantém a matriz Float32Array compartilhada entre o loader e o atualizador
    const gridDataRef = useRef<Float32Array | null>(null);

    // Refs auxiliares síncronas para o loader ler sem closures presas
    const activeExtent3857Ref = useRef<number[] | null>(null);
    const activeExtent4326Ref = useRef<number[] | null>(null);
    const activeDimensionsRef = useRef<{ lons: number; lats: number } | null>(null);
    const stateRef = useRef({ day, hour, metric });

    useEffect(() =>
    {
        activeExtent3857Ref.current = extent3857;
        activeExtent4326Ref.current = extent4326;
        activeDimensionsRef.current = dimensions;
        stateRef.current = { day, hour, metric };
    }, [extent3857, extent4326, dimensions, day, hour, metric]);

    const lons = dimensions?.lons;
    const lats = dimensions?.lats;

    // 1. CRIAÇÃO DA CAMADA
    useEffect(() =>
    {
        const map = mapRef.current;
        if (!map || !isMapReady || !extent3857 || !extent4326 || !lons || !lats) return;

        // Inicializa o array compartilhado se ele ainda não existir
        if (!gridDataRef.current)
        {
            gridDataRef.current = new Float32Array(lons * lats);
        }

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
                const gridData = gridDataRef.current; // 🎯 Lê diretamente o array atualizado

                // Se o dado bruto ainda não chegou ou a matriz está zerada, retorna tile transparente
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
            wrapX: false
        });
        tileSourceRef.current = dataTileSource;

        const webglLayer = new WebGLTileLayer({
            source: dataTileSource,
            style: METRIC_STYLES[metric],
            extent: extent3857,
            zIndex
        });
        webglLayerRef.current = webglLayer;
        map.addLayer(webglLayer);

        // EVENTO DE HOVER
        const handlePointerMove = (evt: MapBrowserEvent<PointerEvent>) =>
        {
            const coord = evt.coordinate;
            const activeExtent = activeExtent3857Ref.current;
            const activeDimensions = activeDimensionsRef.current;

            if (!activeExtent || !activeDimensions) return;

            if (coord[0] >= activeExtent[0] && coord[0] <= activeExtent[2] &&
                coord[1] >= activeExtent[1] && coord[1] <= activeExtent[3])
            {

                const { day: activeDay, metric: activeMetric, hour: activeHour } = stateRef.current;

                getOrFetchDay(activeDay).then((dailyData) =>
                {
                    if (!dailyData) return;
                    const rawMetrics = dailyData.metrics[activeMetric];
                    if (!rawMetrics) return;

                    const flatMetricsArray = rawMetrics as number[];
                    const lonPct = (coord[0] - activeExtent[0]) / (activeExtent[2] - activeExtent[0]);
                    const latPct = (coord[1] - activeExtent[1]) / (activeExtent[3] - activeExtent[1]);

                    const xIdx = Math.min(Math.floor(lonPct * lons), lons - 1);
                    const yIdx = Math.min(Math.floor(latPct * lats), lats - 1);

                    const hourOffset = activeHour * lats * lons;
                    const dataIndex = hourOffset + (yIdx * lons) + xIdx;

                    let val = flatMetricsArray[dataIndex];
                    if (val !== undefined && !isNaN(val) && val < 10000000000)
                    {
                        if (activeMetric === "temperature" && val > 100) val -= 273.15;
                        console.log(`[Hover] ${activeMetric}: ${val.toFixed(2)}`);
                    }
                });
            }
        };

        const eventKey = "pointermove" as "postrender";
        const strictListener = handlePointerMove as unknown as (evt: import("ol/render/Event").default) => void;
        map.on(eventKey, strictListener);

        return () =>
        {
            map.removeLayer(webglLayer);
            map.un(eventKey, strictListener);
            tileSourceRef.current = null;
            webglLayerRef.current = null;
        };
    }, [mapRef, isMapReady, extent3857, extent4326, lons, lats, zIndex]);

    // 2. ATUALIZAÇÃO DA TEXTURA WEBGL
    useEffect(() =>
    {
        const updatePixels = async () =>
        {
            const dailyData = await getOrFetchDay(day);
            if (!dailyData || !tileSourceRef.current || !webglLayerRef.current || !lons || !lats) return;

            const rawMetrics = dailyData.metrics[metric];
            if (!rawMetrics) return;

            const flatMetricsArray = rawMetrics as number[];
            const flatData = new Float32Array(lons * lats);
            const hourOffset = hour * lats * lons;
            let index = 0;

            for (let y = 0; y < lats; y++)
            {
                for (let x = 0; x < lons; x++)
                {
                    const dataIndex = hourOffset + (y * lons) + x;
                    let val = flatMetricsArray[dataIndex];

                    if (val === undefined || isNaN(val) || val > 10000000000) val = 0;
                    if (metric === "temperature" && val > 100) val -= 273.15;
                    flatData[index++] = val;
                }
            }

            // 🎯 ESCRITA DIRETA NA REFERÊNCIA: 
            // O loader passa a enxergar estes novos valores imediatamente no próximo ciclo de desenho.
            gridDataRef.current = flatData;

            webglLayerRef.current.setStyle(METRIC_STYLES[metric]);

            // Força o OpenLayers a redesenhar a GPU
            tileSourceRef.current.clear();
            tileSourceRef.current.refresh();
            tileSourceRef.current.changed();
            mapRef.current?.render();
        };

        updatePixels();
    }, [day, hour, metric, getOrFetchDay, lons, lats, mapRef]);
}