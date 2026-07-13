"use client";

import { useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, transformExtent } from "ol/proj";
import { useMap } from "../../Contexts/MapContext";
import { defaults as defaultControls } from "ol/control";
import Zoom from "ol/control/Zoom";
import { useWeatherData } from "@/app/components/MainMapPage/Contexts/WeatherDataContext";
import WebGLTileLayer from "ol/layer/WebGLTile";
import DataTileSource from "ol/source/DataTile";
import { useSearchParams } from "next/navigation";
import { MetricType, METRIC_STYLES } from "@/app/utils/constants/Scales";
import TileGrid from "ol/tilegrid/TileGrid";

export default function OpenLayersMap()
{
    const mapElement = useRef<HTMLDivElement>(null);
    const { setMap, clearMap, windowSize } = useMap();
    const { cache, getOrFetchDay } = useWeatherData();

    const tileSourceRef = useRef<DataTileSource | null>(null);
    const webglLayerRef = useRef<WebGLTileLayer | null>(null);

    // Buffer linear de alto desempenho lido nativamente pela GPU
    const currentGridDataRef = useRef<Float32Array>(new Float32Array(256 * 256));

    const searchParams = useSearchParams();
    const day = parseInt(searchParams.get("day") || "0", 10);
    const hour = parseInt(searchParams.get("hour") || "0", 10);
    const metric = (searchParams.get("metric") || "temperature") as MetricType;

    // 1. Inicialização da Estrutura Nativa do Mapa
    useEffect(() =>
    {
        if (!mapElement.current) return;

        const numLons = 96;
        const numLats = 60;

        // 1. Calcula a resolução base para o nível de zoom 0
        const baseResolution = (layerExtent[2] - layerExtent[0]) / numLons;

        // 2. Cria o array de resoluções estritamente em ordem decrescente (dividindo por 2 a cada nível)
        const descendingResolutions = new Array(22);
        for (let z = 0; z < 22; ++z)
        {
            descendingResolutions[z] = baseResolution / Math.pow(2, z);
        }
        const dataTileSource = new DataTileSource({
            // 🎯 O SEGREDO DO EXTENT NATIVO: Como o OpenLayers vai gerenciar os blocos globais,
            // nós entregamos o buffer atual para qualquer bloco que ele requisitar dentro da área restrita.
            loader: (z: number, x: number, y: number): Float32Array =>
            {
                return currentGridDataRef.current;
            },
            tileSize: [numLons, numLats],
            bandCount: 1,
            projection: "EPSG:3857",
            wrapX: false,

            // Alinha a malha de projeção com as coordenadas globais reais do mapa
            tileGrid: new TileGrid({
                extent: layerExtent,
                resolutions: resolutions,
                tileSize: [numLons, numLats]
            })
        });
        tileSourceRef.current = dataTileSource;

        // 🎯 ZOOM DINÂMICO: Ajusta o zoom inicial de acordo com o tamanho da janela
        const getInitialZoom = () =>
        {
            if (windowSize === 'desktop') return 9;
            if (windowSize === 'mobile') return 7;
            return 8;
        };

        const webglLayer = new WebGLTileLayer({
            source: dataTileSource,
            style: METRIC_STYLES[metric], // Passa a rampa de cores do Scales direto para o Shader WebGL
            extent: layerExtent
        });
        webglLayerRef.current = webglLayer;

        const map = new Map({
            target: mapElement.current,
            layers: [
                new TileLayer({ source: new OSM() }),
                webglLayer,
            ],
            controls: defaultControls({ zoom: false }).extend([
                new Zoom({ className: "my-custom-zoom" })
            ]),
            view: new View({
                center: fromLonLat([18.20, 40.15]),
                zoom: getInitialZoom(),
                // minZoom: 7,
                // maxZoom: 16,
                // extent: SALENTO_EXTENT,
                smoothExtentConstraint: true
            }),
        });

        map.on("pointermove", (evt) =>
        {
            const coord = evt.coordinate;

            // Verifica se o mouse está estritamente dentro da caixa do Salento
            if (coord[0] >= layerExtent[0] && coord[0] <= layerExtent[2] &&
                coord[1] >= layerExtent[1] && coord[1] <= layerExtent[3])
            {

                // Abre o cache do dia atual para ler os metadados geográficos brutos
                const dailyData = cache[day];
                if (!dailyData) return;

                const numLats = dailyData.lats.length; // 60
                const numLons = dailyData.lons.length; // 96
                const flatMetricsArray = dailyData.metrics[metric] as unknown as number[];
                if (!flatMetricsArray) return;

                // Descobre a porcentagem da posição do mouse dentro do Salento
                const lonPct = (coord[0] - layerExtent[0]) / (layerExtent[2] - layerExtent[0]);
                const latPct = (coord[1] - layerExtent[1]) / (layerExtent[3] - layerExtent[1]);

                // Converte em índices da sua matriz original do NetCDF
                const xIdx = Math.min(Math.floor(lonPct * numLons), numLons - 1);
                const yIdx = Math.min(Math.floor(latPct * numLats), numLats - 1);

                // Aplica o mesmo ponteiro de memória linear do loop do Shader
                const hourOffset = hour * numLats * numLons;
                const dataIndex = hourOffset + (yIdx * numLons) + xIdx;

                let val = flatMetricsArray[dataIndex];

                if (val !== undefined && !isNaN(val) && val < 100000)
                {
                    if (metric === "temperature" && val > 100) val -= 273.15;

                    // 🎯 Aqui você tem o valor exato sob o mouse! 
                    // Pode disparar um setState local para atualizar sua Tooltip na tela.
                    console.log(`Valor Real no Hover (${metric}):`, val.toFixed(2));
                }
            }
        });

        setMap(map);

        return () =>
        {
            map.setTarget(undefined);
            clearMap();
        };
    }, [windowSize, setMap, clearMap]);

    // 2. Alimentação de Dados e Invalidação por Hardware
    useEffect(() =>
    {
        const updateMapData = async () =>
        {
            const dailyData = await getOrFetchDay(day);
            if (!dailyData || !tileSourceRef.current || !webglLayerRef.current) return;

            const rawMetrics = dailyData.metrics[metric];
            if (!rawMetrics) return;

            const flatMetricsArray = rawMetrics as unknown as number[];
            const numLats = dailyData.lats.length; // 60
            const numLons = dailyData.lons.length; // 96

            // 🎯 O buffer agora casa perfeitamente com a resolução nativa de Salento
            const flatData = new Float32Array(numLons * numLats);
            const hourOffset = hour * numLats * numLons;
            let index = 0;

            for (let y = 0; y < numLats; y++)
            {
                const invertedY = numLats - 1 - y;

                for (let x = 0; x < numLons; x++)
                {
                    const dataIndex = hourOffset + (invertedY * numLons) + x;
                    let val = flatMetricsArray[dataIndex];

                    if (val === undefined || isNaN(val) || val > 100000)
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

            // Atualiza a referência que o loader da GPU lê em tempo de execução
            currentGridDataRef.current = flatData;

            webglLayerRef.current.setStyle(METRIC_STYLES[metric]);

            tileSourceRef.current.clear();
            tileSourceRef.current.refresh();
            tileSourceRef.current.changed();
        };

        updateMapData();
    }, [day, hour, metric, getOrFetchDay]);

    return (
        <div className="w-full h-full">
            <div ref={mapElement} className="w-full h-full" />
        </div>
    );
}

const layerExtent = transformExtent([15.90, 38.70, 19.60, 42.65], "EPSG:4326", "EPSG:3857");

const SALENTO_EXTENT = transformExtent(
    [15.90, 38.70, 19.60, 42.65],
    "EPSG:4326",
    "EPSG:3857"
);

const resolutions = [
    156543.03392804097, 78271.51696402048, 39135.75848201024, 19567.87924100512,
    9783.93962050256, 4891.96981025128, 2445.98490512564, 1222.99245256282,
    611.49622628141, 305.74811314070, 152.87405657035, 76.437028285176,
    38.218514142588, 19.109257071294, 9.554628535647, 4.7773142678235
];