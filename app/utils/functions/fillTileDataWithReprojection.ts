import { transform } from "ol/proj";

interface LoaderParams
{
    tileExtent: number[];
    tileWidth: number;
    tileHeight: number;
    activeExtent3857: number[];
    activeExtent4326: number[];
    activeDimensions: { lons: number; lats: number };
    gridData: Float32Array;
}

/**
 * Realiza a reprojeção bilinear reversa de EPSG:3857 para EPSG:4326 pixel a pixel.
 * Garante que a matriz de dados se encaixe milimetricamente na geografia real do mapa.
 */
export function fillTileDataWithReprojection({
    tileExtent,
    tileWidth,
    tileHeight,
    activeExtent3857,
    activeExtent4326,
    activeDimensions,
    gridData,
}: LoaderParams): Float32Array
{
    const tileData = new Float32Array(tileWidth * tileHeight);

    // 1. Verifica interseção espacial básica para não processar blocos fora da área do Salento
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

            // 2. Transforma a coordenada do pixel da tela (metros) de volta para o dado bruto (graus)
            const coord4326 = transform([xCoord3857, yCoord3857], "EPSG:3857", "EPSG:4326");
            const lon = coord4326[0];
            const lat = coord4326[1];

            // 3. Se estiver dentro da área física do seu NetCDF, mapeia para o índice da matriz correspondente
            if (
                lon >= activeExtent4326[0] && lon <= activeExtent4326[2] &&
                lat >= activeExtent4326[1] && lat <= activeExtent4326[3]
            )
            {
                const lonPct = (lon - activeExtent4326[0]) / (activeExtent4326[2] - activeExtent4326[0]);
                const latPct = (lat - activeExtent4326[1]) / (activeExtent4326[3] - activeExtent4326[1]);

                const xGrid = Math.min(Math.floor(lonPct * activeDimensions.lons), activeDimensions.lons - 1);
                const yGrid = Math.min(Math.floor(latPct * activeDimensions.lats), activeDimensions.lats - 1);

                const gridIndex = (yGrid * activeDimensions.lons) + xGrid;
                tileData[idx] = gridData[gridIndex] || 0;
            } else
            {
                tileData[idx] = 0; // Transparente fora do polígono de dados
            }
            idx++;
        }
    }

    return tileData;
}