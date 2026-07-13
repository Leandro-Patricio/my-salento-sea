import { NextRequest, NextResponse } from "next/server";
import { NetCDFReader } from "netcdfjs";
import { DailySliceResponse } from "@/app/utils/types/weatherGrid";
import { githubNcUrl } from "@/app/utils/constants/RepoDetails";

// export const revalidate = 86400; // ⏳ Força o Next.js a guardar em cache e só buscar no GitHub 1 vez a cada 24 horas
export const revalidate = 43200; // ⏳ Força o Next.js a guardar em cache e só buscar no GitHub 1 vez a cada 12 horas

export async function GET(request: NextRequest)
{
    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get("day") || "0";
    const dayIndex = parseInt(dayParam, 10);

    try
    {
        const token = process.env.GITHUB_ACCESS_TOKEN;

        if (!token)
        {
            throw new Error("O token GITHUB_ACCESS_TOKEN não foi configurado no .env");
        }

        // 1. O Next.js intercepta este fetch. Se estiver em cache, ele nem bate no GitHub.
        const response = await fetch(githubNcUrl, {
            headers: {
                // Esse cabeçalho diz ao GitHub quem você é
                "Authorization": `Bearer ${token}`,
                // Esse cabeçalho pede o arquivo bruto (raw) em vez do JSON da API
                "Accept": "application/vnd.github.v3.raw",
            },
            next: {
                revalidate: revalidate, // Mantém em cache no servidor Next.js
                tags: ["netcdf-master"],
            },
        });

        if (!response.ok)
        {
            return new NextResponse(`Erro ao obter arquivo do GitHub: ${response.statusText}`, { status: response.status });
        }

        const arrayBuffer = await response.arrayBuffer();
        const reader = new NetCDFReader(arrayBuffer);

        // 2. Extrai as dimensões fixas da grade geográfica
        const lats = reader.getDataVariable("latitude") as number[];
        const lons = reader.getDataVariable("longitude") as number[];
        const allTimes = reader.getDataVariable("time") as number[];

        const numLats = lats.length;
        const numLons = lons.length;

        // 3. Calcula a janela temporal (24 horas) para o dia solicitado
        // Se day=0, pega índices de 0 a 23. Se day=1, de 24 a 47...
        const startTimeIndex = dayIndex * 24;
        const endTimeIndex = Math.min(startTimeIndex + 24, allTimes.length);

        if (startTimeIndex >= allTimes.length || startTimeIndex < 0)
        {
            return new NextResponse("Índice de dia inválido para a previsão de 9 dias.", { status: 400 });
        }

        // Corta apenas o pedaço do array de tempo correspondente ao dia
        const timesSlice = allTimes.slice(startTimeIndex, endTimeIndex);

        const stepsInDay = timesSlice.length;

        // 3. Captura os dados brutos e lineares do NetCDF (convertendo via unknown/Array)
        const rawSst = reader.getDataVariable("thetao") as unknown as number[];
        const rawWindSpeed = reader.getDataVariable("wind_speed") as unknown as number[];
        const rawWindDir = reader.getDataVariable("wind_dir") as unknown as number[];

        // 4. Inicializa as estruturas tridimensionais vazias para as 24 horas do dia
        const temperature3D: number[][][] = Array.from({ length: stepsInDay }, () =>
            Array.from({ length: numLats }, () => new Array(numLons).fill(0))
        );
        const windSpeed3D: number[][][] = Array.from({ length: stepsInDay }, () =>
            Array.from({ length: numLats }, () => new Array(numLons).fill(0))
        );
        const windDir3D: number[][][] = Array.from({ length: stepsInDay }, () =>
            Array.from({ length: numLats }, () => new Array(numLons).fill(0))
        );

        // 5. Reconstrói a geometria [time][latitude][longitude] a partir do array plano
        // O pulo do gato: o índice linear é (t * numLats * numLons) + (y * numLons) + x
        for (let t = 0; t < stepsInDay; t++)
        {
            const globalTimeIndex = startTimeIndex + t;
            const timeOffset = globalTimeIndex * numLats * numLons;

            for (let y = 0; y < numLats; y++)
            {
                const latOffset = y * numLons;

                for (let x = 0; x < numLons; x++)
                {
                    const linearIndex = timeOffset + latOffset + x;

                    temperature3D[t][y][x] = rawSst[linearIndex];
                    windSpeed3D[t][y][x] = rawWindSpeed[linearIndex];
                    windDir3D[t][y][x] = rawWindDir[linearIndex];
                }
            }
        }

        // 6. Resposta fortemente tipada com a interface criada
        const dailySliceData: DailySliceResponse = {
            day: dayIndex,
            lats,
            lons,
            times: timesSlice,
            metrics: {
                temperature: temperature3D,
                wind_speed: windSpeed3D,
                wind_dir: windDir3D,
            },
        };

        return NextResponse.json(dailySliceData, {
            headers: {
                "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
        });
    } catch (error)
    {
        console.error("Erro ao reconstruir fatias numéricas no servidor:", error);
        return new NextResponse("Erro interno ao processar fatias temporais.", { status: 500 });
    }
}