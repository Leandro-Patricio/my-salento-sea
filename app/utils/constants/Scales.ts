import { Style } from "ol/layer/WebGLTile";
import { generateJetStyle } from "@/app/utils/constants/generateJetStyle";

export type MetricType = "temperature" | "wind_speed" | "wind_dir";

// 🎯 Tipagem estrita usando o Style do WebGLTile do OpenLayers
export const METRIC_STYLES: Record<MetricType, Style> = {
    temperature: generateJetStyle({ min: 10, max: 38, steps: 120 }),
    wind_speed: {
        color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            // 🎯 ESCALA DE VENTO ULTRASUAVE (14 níveis de transição)
            0, [255, 255, 255, 0.0],    // 0 nós - Calmaria Total
            2, [160, 225, 245, 0.30],   // 2 nós - Brisa Imperceptível
            5, [110, 205, 220, 0.38],   // 5 nós - Brisa Muito Leve
            8, [75, 190, 180, 0.44],    // 8 nós - Azul-Gelo
            11, [60, 180, 130, 0.48],    // 11 nós - Verde-Marinho
            14, [90, 195, 100, 0.52],    // 14 nós - Esmeralda Suave
            17, [155, 210, 80, 0.55],    // 17 nós - Amarelo-Esverdeado
            20, [225, 220, 70, 0.58],    // 20 nós - Amarelo Ouro
            23, [240, 180, 55, 0.60],    // 23 nós - Laranja Claro
            26, [240, 130, 45, 0.62],    // 26 nós - Laranja Alerta
            30, [230, 80, 45, 0.65],     // 30 nós - Vermelho Coral
            35, [215, 45, 75, 0.68],     // 35 nós - Vermelho Queimado
            40, [180, 40, 160, 0.72],    // 40 nós - Roxo Ventania
            50, [130, 20, 180, 0.78]     // 50 nós+ - Violeta Tempestade
        ],
    },
    wind_dir: {
        color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            // 🎯 ESPECTRO CIRCULAR CONTÍNUO (13 níveis para transições angulares milimétricas)
            0, [220, 50, 50, 0.55],     // 0° (Norte) - Vermelho
            30, [225, 95, 45, 0.55],     // 30° (Norte-Nordeste) - Laranja Avermelhado
            60, [230, 150, 45, 0.55],    // 60° (Leste-Nordeste) - Laranja Ouro
            90, [220, 210, 50, 0.55],    // 90° (Leste) - Amarelo
            120, [155, 200, 65, 0.55],    // 120° (Leste-Sudeste) - Verde Limão
            150, [90, 190, 95, 0.55],     // 150° (Sul-Sudeste) - Verde Água
            180, [50, 180, 160, 0.55],    // 180° (Sul) - Ciano / Turquesa
            210, [55, 140, 210, 0.55],    // 210° (Sul-Sudoeste) - Azul Cobalto
            240, [65, 95, 215, 0.55],     // 240° (Oeste-Sudoeste) - Azul Índigo
            270, [115, 60, 215, 0.55],    // 270° (Oeste) - Violeta Escuro
            300, [170, 55, 205, 0.55],    // 300° (Oeste-Noroeste) - Roxo Magnético
            330, [215, 50, 140, 0.55],    // 330° (Norte-Noroeste) - Magenta / Rosa
            360, [220, 50, 50, 0.55]      // 360° (Norte) - Retorno perfeito ao Vermelho
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