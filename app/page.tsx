import MainMapPage from "./components/MainMapPage/MainMapPage";
import { Buoys } from "./types/buoys";


const points: Buoys = [
  { name: "Gallipoli", coords: [17.95, 40.05] },
  { name: "Otranto", coords: [18.50, 40.14] },
  { name: "Leuca", coords: [18.36, 39.78] },
]

export default function Home()
{
  return (
    <main className="h-full w-full">
      <MainMapPage points={points} />
    </main>
  );
}
