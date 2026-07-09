// Definindo estritamente as opções com a propriedade de imagem que você vai alimentar
interface BasemapOption
{
    id: "osm" | "esri" | "dark";
    name: string;
    url: string;
    imagePath: string;
    bgClass: string; // Classe provisória para você injetar as imagens de fundo depois
}

export const defaultBasemap: tileLayerType = "osm";

export const basemaps: BasemapOption[] = [
    {
        id: "osm",
        name: "Padrão (OSM)",
        url: "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        imagePath: "/TileLayer/OSM.png",
        bgClass: "bg-slate-200" // Altere para bg-[url('/seu-caminho/osm.jpg')]
    },
    {
        id: "esri",
        name: "Satélite (Esri)",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        imagePath: "/TileLayer/Esri.png",
        bgClass: "bg-emerald-200" // Altere para bg-[url('/seu-caminho/esri.jpg')]
    },
    {
        id: "dark",
        name: "Escuro",
        url: "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        imagePath: "/TileLayer/Dark.png",
        bgClass: "bg-slate-800" // Altere para bg-[url('/seu-caminho/dark.jpg')]
    },
] as const

export type tileLayerType = (typeof basemaps)[number]["id"];