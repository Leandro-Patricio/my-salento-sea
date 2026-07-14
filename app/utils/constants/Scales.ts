import { Style } from "ol/layer/WebGLTile";

export type MetricType = "temperature" | "wind_speed" | "wind_dir";

// 🎯 Tipagem estrita usando o Style do WebGLTile do OpenLayers
export const METRIC_STYLES: Record<MetricType, Style> = {
    temperature: {
        color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            0, [0, 0, 0, 0.0],
            15, [0, 0, 255, 0.6],  // 15°C = Azul
            23, [0, 255, 255, 0.6], // 23°C = Ciano
            28, [0, 255, 0, 0.6],   // 28°C = Verde
            35, [255, 0, 0, 0.6],   // 35°C = Vermelho
        ],
    },
    wind_speed: {
        color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            0, [255, 255, 255, 0.0], // Sem vento = Invisível
            5, [0, 255, 0, 0.5],     // 5 nós = Verde leve
            15, [255, 255, 0, 0.6],   // 15 nós = Amarelo
            30, [255, 0, 0, 0.7],     // 30 nós = Vermelho Alerta
        ],
    },
    wind_dir: {
        color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            0, [0, 0, 0, 0],         // Norte = Vermelho
            90, [0, 255, 0, 0.6],   // Leste = Verde
            180, [0, 0, 255, 0.6],   // Sul = Azul
            270, [255, 255, 0, 0.6], // Oeste = Amarelo
        ],
    },
};

export interface MetricConfig
{
    id: MetricType;
    name: string;
    icon: string;
}

export const STATIC_METRICS_LIST: MetricConfig[] = [
    { id: "temperature", name: "Temperatura", icon: "🌡️" },
    { id: "wind_speed", name: "Velocidade do Vento", icon: "💨" },
    { id: "wind_dir", name: "Direção do Vento", icon: "🧭" }
];