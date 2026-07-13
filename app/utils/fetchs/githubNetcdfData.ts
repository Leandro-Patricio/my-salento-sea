/**
 * Busca o arquivo NetCDF (.nc) de 150MB vindo do cache do servidor Next.js
 * e o entrega como um ArrayBuffer pronto para processamento binário.
 */
export async function githubNetcdfData(): Promise<ArrayBuffer | null>
{
    try
    {
        // Faz o download direto da nossa rota segura
        const response = await fetch("/api/getNetcdfDataFromGithub");
        console.log("Dados NetCDF recebidos com sucesso!", response);

        if (!response.ok)
        {
            throw new Error(`Falha no download dos dados meteorológicos/oceanográficos: ${response.statusText}`);
        }

        // 🔥 Carrega o binário direto para a memória RAM do navegador de forma ultra performática
        const netcdfBuffer = await response.arrayBuffer();

        return netcdfBuffer;
    } catch (error)
    {
        console.error("Erro ao obter dados NetCDF no cliente:", error);
        return null;
    }
}