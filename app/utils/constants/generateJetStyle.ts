import { Style } from "ol/layer/WebGLTile";

/**
 * Gera uma rampa de cores Jet matemática pura
 * @param min Temperatura mínima da escala (onde o azul começa)
 * @param max Temperatura máxima da escala (onde o vermelho escuro termina)
 * @param steps Quantidade de divisões de cor desejadas (ex: 50, 100, 200)
 */

type generateJetStyleProps = {
    min: number;
    max: number;
    steps?: number;
}

type ExpressionValue = string | number | boolean | ExpressionValue[];

// 🎯 Alteramos o retorno interno para devolver o objeto { color: ... } que satisfaz a tipagem 'Style'
export function generateJetStyle({ min, max, steps = 50 }: generateJetStyleProps): Style
{
    const colorExpression: ExpressionValue[] = [
        "interpolate" as ExpressionValue,
        ["linear"] as ExpressionValue,
        ["band", 1] as ExpressionValue,
        0 as ExpressionValue,
        [0, 0, 0, 0.0] as ExpressionValue
    ];

    const tempRange = max - min;

    for (let i = 0; i <= steps; i++)
    {
        const pct = i / steps;
        const temp = min + (pct * tempRange);

        const r = Math.max(0, Math.min(1, 1.5 - Math.abs(pct * 4 - 3)));
        const g = Math.max(0, Math.min(1, 1.5 - Math.abs(pct * 4 - 2)));
        const b = Math.max(0, Math.min(1, 1.5 - Math.abs(pct * 4 - 1)));

        const rgb = [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255),
            0.60
        ];

        colorExpression.push(temp as ExpressionValue, rgb as ExpressionValue);
    }

    // 🎯 Retornamos o objeto de estilo completo estruturado
    return {
        color: colorExpression as unknown as Style["color"]
    };
}