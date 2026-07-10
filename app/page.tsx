import MainMapPage from "./components/MainMapPage/MainMapPage";
import { tileLayerType } from "./utils/constants/BaseTyleLayers";
import { Buoys } from "./utils/types/buoys";


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
  // 1. Aguarda a resolução dos searchParams (obrigatório no Next.js moderno)
  const params = await searchParams;

  // 2. Extrai o parâmetro do basemap e valida se ele é um dos tipos aceitos
  const urlBasemap = params.basemap as string;

  // Se o que estiver na URL não for válido, define 'osm' como fallback seguro
  const initialBasemap: tileLayerType = ["osm", "esri", "dark"].includes(urlBasemap) ? (urlBasemap as tileLayerType) : "osm";


  return (
    <main className="h-full w-full">
      <MainMapPage
        points={points}
        initialBasemap={initialBasemap}
      />
    </main>
  );
}
