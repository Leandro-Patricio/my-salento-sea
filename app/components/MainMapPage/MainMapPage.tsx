'use client'
import dynamic from "next/dynamic";
import { MapProvider } from "./components/OpenLayerMap/MapContext";
import LeftMenu from "./components/LeftMenu/LeftMenu";
import { Buoys } from "@/app/utils/types/buoys";
import RightMenu from "./components/RightMenu/RightMenu";
import { tileLayerType } from "@/app/utils/constants/BaseTyleLayers";
import BuoysComponent from "./components/Buoys/BuoysWithPopup";


// Import dinâmico com SSR desabilitado para performance e segurança de build
const SalentoMap = dynamic(() => import("./components/OpenLayerMap/OpenLayersMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center animate-pulse ">
            <p className="text-slate-200 font-medium animate-bounce">
                Preparing the map for the best beach...
            </p>
        </div>
    ),
});

type MainMapPageProps = {
    points: Buoys
    initialBasemap: tileLayerType
};

export default function MainMapPage({ points, initialBasemap }: MainMapPageProps)
{
    return (
        <MapProvider
            points={points}
            initialBasemap={initialBasemap}
        >
            <main className="h-full w-full">
                <SalentoMap />
                <LeftMenu />
                <RightMenu />
                <BuoysComponent />
            </main>
        </MapProvider>
    );
}