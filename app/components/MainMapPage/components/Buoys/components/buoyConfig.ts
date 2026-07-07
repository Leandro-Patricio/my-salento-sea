import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Map from "ol/Map";
import { fromLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Icon, Style } from "ol/style";

export interface Buoy
{
    name: string;
    coords: number[]
}

export function buoyConfig(map: Map, buoys: Buoy[])
{
    const features = buoys.map((buoy) =>
    {
        const feature = new Feature({
            geometry: new Point(fromLonLat(buoy.coords)),
        });

        // Vincula os dados brutos à feature
        feature.setProperties({ buoyData: buoy });

        feature.setStyle(
            new Style({
                image: new Icon({
                    anchor: [0.5, 1],
                    src: "/buoy.svg",
                    scale: .1,
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