import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Map from "ol/Map";
import { fromLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Icon, Style } from "ol/style";
import { windowSizeType } from "@/app/utils/types/diverse";
import { buoySvg } from "@/public/buoySvg";
import { tileLayerType } from "@/app/utils/constants/BaseTyleLayers";


export interface Buoy
{
    name: string;
    coords: number[]
}

type buoyConfigType = {
    map: Map,
    points: Buoy[],
    windowSize: windowSizeType
    activeTileLayer: tileLayerType
}

export function buoyConfig({ map, points, windowSize, activeTileLayer }: buoyConfigType)
{
    const features = points.map((buoy) =>
    {
        const feature = new Feature({
            geometry: new Point(fromLonLat(buoy.coords)),
        });

        // Vincula os dados brutos à feature
        feature.setProperties({ buoyData: buoy });

        const imageColor = activeTileLayer === 'osm' ? 'black' : 'white';

        feature.setStyle(
            new Style({
                image: new Icon({
                    anchor: [0.5, 1],
                    src: getBuoyIconUrl(imageColor),
                    scale: windowSize === 'mobile' ? 0.07 : 0.1,
                }),
            })
        );

        return feature;
    });

    const vectorSource = new VectorSource({ features });
    const vectorLayer = new VectorLayer({ source: vectorSource });

    // Adiciona a camada de marcadores ao mapa existente
    map.addLayer(vectorLayer);

    // Altera o cursor do mouse ao passar por cima das boias
    map.on("pointermove", (event) =>
    {
        const hit = map.hasFeatureAtPixel(event.pixel, { hitTolerance: 10 });
        map.getTargetElement().style.cursor = hit ? "pointer" : "";
    });

    return vectorLayer; // Retorna a camada caso queira removê-la depois
}


export const getBuoyIconUrl = (color: string): string =>
{
    const svgString = buoySvg(color);
    // Transforma a string XML do vetor em uma imagem de dados legível
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
};