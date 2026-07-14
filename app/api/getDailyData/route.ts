import { NextRequest, NextResponse } from "next/server";
import { DailySliceResponse } from "@/app/utils/types/weatherGrid";
import { ready } from "h5wasm";


// 🧠 CACHE EM MEMÓRIA NO SERVIDOR (Evita o limite de 2MB do Next.js)
// Guardamos o Buffer e o timestamp da última carga na memória RAM do Node
let cachedArrayBuffer: ArrayBuffer | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 horas em milissegundos

export async function GET(request: NextRequest)
{
    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get("day") || "0";
    const dayIndex = parseInt(dayParam, 10);

    // 🎯 CORREÇÃO DA URL: Aponta estritamente para o arquivo RAW binário do repositório público
    const githubRawNcUrl = "https://raw.githubusercontent.com/rafaelgmenezes/SalentoCast/main/data/merged_ds_cmems_ifs.nc";

    try
    {
        const token = process.env.GITHUB_ACCESS_TOKEN;
        if (!token)
        {
            throw new Error("O token GITHUB_ACCESS_TOKEN não foi configurado no .env");
        }

        const now = Date.now();

        // Se não temos cache ou se o cache expirou, faz o download real
        if (!cachedArrayBuffer || (now - lastFetchTime) > CACHE_DURATION)
        {
            console.log("📥 Cache expirado ou ausente. Baixando 130MB brutos do NetCDF a partir do GitHub...");

            const response = await fetch(githubRawNcUrl, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/vnd.github.v3.raw", // Garante o stream de bytes
                },
                // ⚠️ REMOVIDO: O next.revalidate causava o estouro de cache de 2MB. 
                // Agora usamos o cache nativo em memória acima.
                cache: "no-store",
            });

            if (!response.ok) return new NextResponse(`Erro ao buscar arquivo no GitHub: ${response.statusText}`, { status: response.status });


            cachedArrayBuffer = await response.arrayBuffer();
            lastFetchTime = now;
            console.log("✅ Arquivo NetCDF carregado e imunizado no cache de memória do servidor.");
        } else
        {
            console.log("⚡ Servindo a partir do cache de memória interna do servidor (0ms de download).");
        }

        // 2. Inicializa o motor WebGL/WebAssembly do H5WASM
        await ready;
        const h5w = await import("h5wasm");
        const wasmFS = h5w.FS;

        // Cria um arquivo virtual na memória do WebAssembly para leitura direta
        const vPath = "salento_data.nc";
        wasmFS?.writeFile(vPath, new Uint8Array(cachedArrayBuffer));

        const file = new h5w.File(vPath, "r");

        // 🎯 FUNÇÃO AUXILIAR: Valida se o objeto existe antes de usá-lo, eliminando o erro de 'possibly null'
        const getDataset = (name: string) =>
        {
            const dataset = file.get(name);
            if (!dataset)
            {
                throw new Error(`Dataset '${name}' não foi encontrado no arquivo NetCDF.`);
            }
            // Assegura ao compilador que a entidade possui as propriedades de um Dataset (como .value e .slice)
            return dataset as import("h5wasm").Dataset;
        };

        // 3. Extrai as dimensões da grade (No HDF5/NetCDF4, acessamos via caminhos de propriedades)
        const lats = getDataset("latitude").value as number[];
        const lons = getDataset("longitude").value as number[];
        const allTimes = getDataset("time").value as number[];

        const numLats = lats.length;
        const numLons = lons.length;

        // 4. Calcula a janela temporal (24h por dia)
        const startTimeIndex = dayIndex * 24;
        const endTimeIndex = Math.min(startTimeIndex + 24, allTimes.length);

        if (startTimeIndex >= allTimes.length || startTimeIndex < 0)
        {
            file.close();
            return new NextResponse("Índice de dia inválido para a previsão.", { status: 400 });
        }

        const timesSlice = Array.from(allTimes.slice(startTimeIndex, endTimeIndex));

        // 5. Extrai as fatias tridimensionais usando fatiamento nativo do H5WASM (Slicing)
        // O motor C/Wasm faz o corte diretamente no binário de forma absurdamente rápida
        // Passamos o array de corte: [[tempo_inicio, tempo_fim], [lat_inicio, lat_fim], [lon_inicio, lon_fim]]
        const tempDataset = getDataset("thetao") as import("h5wasm").Dataset;
        const speedDataset = getDataset("wind_speed") as import("h5wasm").Dataset;
        const dirDataset = getDataset("wind_dir") as import("h5wasm").Dataset;

        const temperature3D = tempDataset?.slice([
            [startTimeIndex, endTimeIndex],
            [0, numLats],
            [0, numLons]
        ]) as NetCDFSlices | null;

        const windSpeed3D = speedDataset?.slice([
            [startTimeIndex, endTimeIndex],
            [0, numLats],
            [0, numLons]
        ]) as NetCDFSlices | null;

        const windDir3D = dirDataset?.slice([
            [startTimeIndex, endTimeIndex],
            [0, numLats],
            [0, numLons]
        ]) as NetCDFSlices | null;

        // Fecha os handles do arquivo virtual para liberar memória RAM (Mantenha este bloco)
        file.close();
        wasmFS?.unlink(vPath);

        const rawTemperature = Array.from(temperature3D as unknown as Float32Array);
        const rawWindSpeed = Array.from(windSpeed3D as unknown as Float32Array);
        const rawWindDir = Array.from(windDir3D as unknown as Float32Array);

        // Monta e retorna o payload limpo seguindo estritamente a tipagem DailySliceResponse
        const dailySliceData: DailySliceResponse = {
            day: dayIndex,
            lats: Array.from(lats),
            lons: Array.from(lons),
            times: timesSlice,
            metrics: {
                temperature: rawTemperature,
                wind_speed: rawWindSpeed,
                wind_dir: rawWindDir,
            },
        };

        return NextResponse.json(dailySliceData);
    } catch (error)
    {
        console.error("Erro interno ao processar NetCDF-4 na rota:", error);
        return new NextResponse("Erro interno ao processar dados meteorológicos.", { status: 500 });
    }
}

type Numeric2D = number[][];
type Numeric3D = number[][][];
type NetCDFSlices = Numeric2D | Numeric3D;