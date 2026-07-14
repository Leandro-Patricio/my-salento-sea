// import DataLayerFromStream from "@/app/components/MainMapPage/components/OpenLayerMap/DataLayerFromStream";
// import { githubNetcdfData } from "@/app/utils/fetchs/githubNetcdfData"; // Sua função que faz o fetch interno na rota acima


// export default async function MeteorologicalData()
// {
//     // O servidor aguarda o cache da rota resolver e trazer o JSON de grade mastigado
//     const gridData = await githubNetcdfData();

//     if (!gridData)
//     {
//         return <div className="hidden">Não foi possível carregar os dados da grade.</div>;
//     }

//     // Quando o dado brotar do stream, ele é injetado diretamente neste componente cliente
//     return <DataLayerFromStream gridData={gridData} />;
// } 