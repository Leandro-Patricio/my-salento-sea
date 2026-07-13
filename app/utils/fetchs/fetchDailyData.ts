import { DailySliceResponse } from "../types/weatherGrid";

/**
 * Busca a array de dados numéricos de um dia específico (24 horas)
 * a partir do servidor fatiador do Next.js.
 * 
 * @param day Número do dia desejado (0 para hoje, 1 para amanhã, etc.)
 */
export async function fetchDailyData(day: number): Promise<DailySliceResponse | null>
{
    try
    {
        console.log(`Buscando dados numéricos comprimidos para o Dia ${day}...`);

        // Faz a requisição enviando o parâmetro do dia
        const response = await fetch(`/api/getDailyData?day=${day}`);

        if (!response.ok)
        {
            throw new Error(`Falha ao obter dados da previsão diária: ${response.statusText}`);
        }

        // Recebe o JSON contendo estritamente as arrays numéricas [time][lat][lon] daquele dia
        const dailyData = await response.json();

        console.log(`Dados numéricos do Dia ${day} recebidos com sucesso!`);
        return dailyData;
    } catch (error)
    {
        console.error(`Erro ao buscar dados do Dia ${day} no cliente:`, error);
        return null;
    }
}