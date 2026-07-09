
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import { useEffect, RefObject } from "react";
import Map from "ol/Map";
import { basemaps, tileLayerType } from "../constants/BaseTyleLayers";


type useUpdateActiveTileLayerProps = {
    initialBasemap: tileLayerType;
    isMapReady: boolean;
    mapRef: RefObject<Map | null>
    activeTileLayer: tileLayerType;
    setActiveTileLayer: React.Dispatch<React.SetStateAction<tileLayerType>>

};

export default function useUpdateActiveTileLayer({ initialBasemap, isMapReady, mapRef, activeTileLayer, setActiveTileLayer }: useUpdateActiveTileLayerProps)
{

    if (initialBasemap !== activeTileLayer) setActiveTileLayer(initialBasemap);

    useEffect(() =>
    {
        const map = mapRef.current;
        if (!map || !isMapReady) return;

        const layers = map.getLayers().getArray();
        if (layers.length > 0 && layers[0] instanceof TileLayer)
        {
            const newMapObject = basemaps.find((mapObject) => mapObject.id === activeTileLayer);
            if (!newMapObject) return;

            // Confere se a URL antiga é diferente da nova antes de aplicar para economizar processamento
            const currentSource = layers[0].getSource();
            const currentUrl = currentSource instanceof XYZ ? currentSource.getUrls() : "";

            if (currentUrl !== newMapObject.url)
            {
                layers[0].setSource(new XYZ({ url: newMapObject.url }));
            }
        }
    }, [activeTileLayer, isMapReady, mapRef]);

};