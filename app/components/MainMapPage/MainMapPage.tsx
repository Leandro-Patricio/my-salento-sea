'use client'
import dynamic from "next/dynamic";
import { MapProvider } from "./components/OpenLayerMap/MapContext";
import LeftMenu from "./components/LeftMenu/LeftMenu";
import BuoyPopup from "./components/Buoys/BuoysWithPopup";
import { Buoys } from "@/app/types/buoys";

// Import dinâmico com SSR desabilitado para performance e segurança de build
const SalentoMap = dynamic(() => import("./components/OpenLayerMap/OpenLayersMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[calc(100vh-180px)] bg-slate-100 flex items-center justify-center animate-pulse rounded-xl border border-slate-200">
            <p className="text-slate-500 font-medium animate-bounce">
                Inicializando motor gráfico do OpenLayers...
            </p>
        </div>
    ),
});

type MainMapPageProps = {
    points: Buoys
};

export default function MainMapPage({ points }: MainMapPageProps)
{
    return (
        <MapProvider
            points={points}
        >
            <main className="h-full w-full">
                <SalentoMap />
                <LeftMenu />
                <BuoyPopup />
            </main>
        </MapProvider>
    );
}