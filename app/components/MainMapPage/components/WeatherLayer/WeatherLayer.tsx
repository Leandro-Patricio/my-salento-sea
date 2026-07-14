"use client";

import { useEffect, useRef, useState } from "react";
import { transformExtent, transform } from "ol/proj";
import { useMap } from "../../Contexts/MapContext";
import { useWeatherData } from "@/app/components/MainMapPage/Contexts/WeatherDataContext";
import WebGLTileLayer from "ol/layer/WebGLTile";
import DataTileSource from "ol/source/DataTile";
import { useSearchParams } from "next/navigation";
import { MetricType, METRIC_STYLES } from "@/app/utils/constants/Scales";
import MapBrowserEvent from "ol/MapBrowserEvent";

export default function WeatherLayer()
{
    const { mapRef, isMapReady } = useMap();
    const { getOrFetchDay } = useWeatherData();

    const searchParams = useSearchParams();
    const day = parseInt(searchParams.get("day") || "0", 10);
    const hour = parseInt(searchParams.get("hour") || "0", 10);
    const metric = (searchParams.get("metric") || "temperature") as MetricType;

    const tileSourceRef = useRef<DataTileSource | null>(null);
    const webglLayerRef = useRef<WebGLTileLayer | null>(null);

    const currentGridDataRef = useRef<Float32Array | null>(null);

    const [extentString, setExtentString] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState<{ lons: number; lats: number } | null>(null);

    const computedExtent = extentString ? extentString.split(",").map(Number) : null;

    // Extensão geográfica original em EPSG:4326 (para mapeamento de pixels do loader)
    const [extent4326, setExtent4326] = useState<number[] | null>(null);

    // Refs para o Hover e Loader
    const currentMetricRef = useRef<MetricType>(metric);
    const currentHourRef = useRef<number>(hour);
    const currentDayRef = useRef<number>(day);
    const computedExtentRef = useRef<number[] | null>(null);
    const extent4326Ref = useRef<number[] | null>(null);
    const dimensionsRef = useRef<{ lons: number; lats: number } | null>(null);

    useEffect(() =>
    {
        currentMetricRef.current = metric;
        currentHourRef.current = hour;
        currentDayRef.current = day;
        computedExtentRef.current = computedExtent;
        extent4326Ref.current = extent4326;
        dimensionsRef.current = dimensions;
    }, [metric, hour, day, extentString, extent4326, dimensions]);

    // 1. CARGA E CÁLCULO DINÂMICO DOS LIMITES GEOGRÁFICOS DO NETCDF
    useEffect(() =>
    {
        const loadDimensions = async () =>
        {
            const dailyData = await getOrFetchDay(day);
            if (!dailyData) return;

            const nLons = dailyData.lons.length;
            const nLats = dailyData.lats.length;

            const minLon = dailyData.lons[0];
            const maxLon = dailyData.lons[nLons - 1];
            const minLat = dailyData.lats[0];
            const maxLat = dailyData.lats[nLats - 1];

            setExtent4326([minLon, minLat, maxLon, maxLat]);

            // Extensão em EPSG:3857 (metros)
            const dynamicExtent = transformExtent([minLon, minLat, maxLon, maxLat], "EPSG:4326", "EPSG:3857");
            const dynamicExtentStr = dynamicExtent.join(",");

            if (dynamicExtentStr !== extentString)
            {
                setExtentString(dynamicExtentStr);
                setDimensions({ lons: nLons, lats: nLats });
            }
        };

        loadDimensions();
    }, [day, getOrFetchDay, extentString]);

    // 2. CONTROLE E CRIAÇÃO DA CAMADA GRAFICA WEBGL
    useEffect(() =>
    {
        const map = mapRef.current;
        if (!map || !isMapReady || !computedExtent || !dimensions) return;

        const numLons = dimensions.lons;
        const numLats = dimensions.lats;

        currentGridDataRef.current = new Float32Array(numLons * numLats);

        const tileWidth = 256;
        const tileHeight = 256;

        const dataTileSource = new DataTileSource({
            // 🎯 MAPEAMENTO BILINEAR DIRETO NO ESPAÇO GEOGRÁFICO:
            // Pegamos o bloco do mapa solicitado pelo OpenLayers e calculamos onde cada pixel
            // cai em EPSG:4326 para buscar o valor real na matriz 96x60.
            // Isso anula qualquer desalinhamento ou repetição de grid no zoom!
            loader: (z, x, y): Float32Array =>
            {
                const tileGrid = dataTileSource.getTileGrid();
                const tileData = new Float32Array(tileWidth * tileHeight);
                if (!tileGrid) return tileData;

                const tileExtent = tileGrid.getTileCoordExtent([z, x, y]);
                const activeExtent3857 = computedExtentRef.current;
                const activeExtent4326 = extent4326Ref.current;
                const activeDimensions = dimensionsRef.current;
                const gridData = currentGridDataRef.current;

                if (!activeExtent3857 || !activeExtent4326 || !activeDimensions || !gridData)
                {
                    return tileData;
                }

                // Verifica se o bloco requisitado pelo mapa intercepta a área do Salento
                const overlaps = (
                    tileExtent[0] < activeExtent3857[2] && tileExtent[2] > activeExtent3857[0] &&
                    tileExtent[1] < activeExtent3857[3] && tileExtent[3] > activeExtent3857[1]
                );

                if (!overlaps) return tileData;

                const xRes = (tileExtent[2] - tileExtent[0]) / tileWidth;
                const yRes = (tileExtent[3] - tileExtent[1]) / tileHeight;

                let idx = 0;
                for (let j = 0; j < tileHeight; j++)
                {
                    const yCoord3857 = tileExtent[3] - (j + 0.5) * yRes;
                    for (let i = 0; i < tileWidth; i++)
                    {
                        const xCoord3857 = tileExtent[0] + (i + 0.5) * xRes;

                        // Reprojeta a coordenada do pixel do mapa (3857) de volta para o dado bruto (4326)
                        const coord4326 = transform([xCoord3857, yCoord3857], "EPSG:3857", "EPSG:4326");
                        const lon = coord4326[0];
                        const lat = coord4326[1];

                        // Verifica se a coordenada está dentro dos limites do NetCDF
                        if (lon >= activeExtent4326[0] && lon <= activeExtent4326[2] &&
                            lat >= activeExtent4326[1] && lat <= activeExtent4326[3])
                        {
                            const lonPct = (lon - activeExtent4326[0]) / (activeExtent4326[2] - activeExtent4326[0]);
                            const latPct = (lat - activeExtent4326[1]) / (activeExtent4326[3] - activeExtent4326[1]);

                            const xGrid = Math.min(Math.floor(lonPct * activeDimensions.lons), activeDimensions.lons - 1);
                            const yGrid = Math.min(Math.floor(latPct * activeDimensions.lats), activeDimensions.lats - 1);

                            const gridIndex = (yGrid * activeDimensions.lons) + xGrid;
                            tileData[idx] = gridData[gridIndex] || 0;
                        }
                        else
                        {
                            tileData[idx] = 0; // Transparente fora dos limites reais
                        }
                        idx++;
                    }
                }

                return tileData;
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
            extent: computedExtent // Recorta a exibição estritamente nos limites reais do NetCDF
        });
        webglLayerRef.current = webglLayer;

        map.addLayer(webglLayer);

        // 🎯 EVENTO DE HOVER ESTÁVEL (Ponteiro mapeado na projeção 3857)
        const handlePointerMove = (evt: MapBrowserEvent<PointerEvent>) =>
        {
            const coord = evt.coordinate;
            const activeExtent = computedExtentRef.current;
            const activeDimensions = dimensionsRef.current;

            if (!activeExtent || !activeDimensions) return;

            if (coord[0] >= activeExtent[0] && coord[0] <= activeExtent[2] &&
                coord[1] >= activeExtent[1] && coord[1] <= activeExtent[3])
            {
                const activeDay = currentDayRef.current;
                const activeMetric = currentMetricRef.current;
                const activeHour = currentHourRef.current;

                getOrFetchDay(activeDay).then((dailyData) =>
                {
                    if (!dailyData) return;

                    const rawMetrics = dailyData.metrics[activeMetric];
                    if (!rawMetrics) return;

                    const flatMetricsArray = rawMetrics as number[];

                    const lonPct = (coord[0] - activeExtent[0]) / (activeExtent[2] - activeExtent[0]);
                    const latPct = (coord[1] - activeExtent[1]) / (activeExtent[3] - activeExtent[1]);

                    const xIdx = Math.min(Math.floor(lonPct * activeDimensions.lons), activeDimensions.lons - 1);
                    const yIdx = Math.min(Math.floor(latPct * activeDimensions.lats), activeDimensions.lats - 1);

                    const hourOffset = activeHour * activeDimensions.lats * activeDimensions.lons;
                    const dataIndex = hourOffset + (yIdx * activeDimensions.lons) + xIdx;

                    let val = flatMetricsArray[dataIndex];

                    if (val !== undefined && !isNaN(val) && val < 10000000000)
                    {
                        if (activeMetric === "temperature" && val > 100)
                        {
                            val -= 273.15;
                        }
                        console.log(`[Hover] Métrica: ${activeMetric} | Valor: ${val.toFixed(2)} | Coords: [${xIdx}, ${yIdx}]`);
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
    }, [mapRef, isMapReady, extentString, dimensions]);

    // 3. ATUALIZAÇÃO REATIVA DE DADOS NA MEMÓRIA DA GPU (Sem alterações de índice)
    useEffect(() =>
    {
        const updatePixels = async () =>
        {
            const dailyData = await getOrFetchDay(day);
            if (!dailyData || !tileSourceRef.current || !webglLayerRef.current || !dimensions) return;

            const rawMetrics = dailyData.metrics[metric];
            if (!rawMetrics) return;

            const flatMetricsArray = rawMetrics as number[];
            const numLats = dimensions.lats;
            const numLons = dimensions.lons;

            const flatData = new Float32Array(numLons * numLats);
            const hourOffset = hour * numLats * numLons;
            let index = 0;

            // Mantém a estrutura de leitura natural Sul-Norte (sem inversão) compatível com o loader 4326
            for (let y = 0; y < numLats; y++)
            {
                for (let x = 0; x < numLons; x++)
                {
                    const dataIndex = hourOffset + (y * numLons) + x;
                    let val = flatMetricsArray[dataIndex];

                    // Ignora o valor de máscara gigante do GRIB (ex: 10^20) definindo como 0 (transparente)
                    if (val === undefined || isNaN(val) || val > 10000000000)
                    {
                        val = 0;
                    }
                    if (metric === "temperature" && val > 100)
                    {
                        val -= 273.15;
                    }
                    flatData[index++] = val;
                }
            }

            currentGridDataRef.current = flatData;
            webglLayerRef.current.setStyle(METRIC_STYLES[metric]);

            tileSourceRef.current.clear();
            tileSourceRef.current.refresh();
            tileSourceRef.current.changed();
        };

        updatePixels();
    }, [day, hour, metric, getOrFetchDay, dimensions]);

    return null;
}