import { Suspense } from "react";
import MainMapPage from "./components/MainMapPage/MainMapPage";
import { tileLayerType } from "./utils/constants/BaseTyleLayers";
import { githubNetcdfData } from "./utils/fetchs/githubNetcdfData";
import { Buoys } from "./utils/types/buoys";
import MeteorologicalData from "./utils/fetchs/SuspenseGetNetcdfData";


const points: Buoys = [
  { name: "Gallipoli", coords: [17.95, 40.05] },
  { name: "Otranto", coords: [18.50, 40.14] },
  { name: "Leuca", coords: [18.36, 39.78] },
]

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home({ searchParams }: PageProps)
{

  const params = await searchParams;// 1. Aguarda a resolução dos searchParams (obrigatório no Next.js moderno)
  const urlBasemap = params.basemap as string;// 2. Extrai o parâmetro do basemap e valida se ele é um dos tipos aceitos

  // Se o que estiver na URL não for válido, define 'osm' como fallback seguro
  const initialBasemap: tileLayerType = ["osm", "esri", "dark"].includes(urlBasemap) ? (urlBasemap as tileLayerType) : "osm";



  return (
    <main className="h-full w-full">
      <MainMapPage
        points={points}
        initialBasemap={initialBasemap}
      />
      {/* <Suspense fallback={
        <div className="absolute top-4 right-4 bg-slate-900/90 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50 animate-pulse">
          Carregando dados do mapa...
        </div>
      }>
        <MeteorologicalData />
      </Suspense> */}
    </main>
  );
}
