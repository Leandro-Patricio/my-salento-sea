"use client";


import { useMap } from "../../Contexts/MapContext";
import Link from "next/link";
import Image from "next/image";
import BasemapSwitcher from "./BasemapSwitcher";




export default function LeftMenu()
{
    const { windowSize } = useMap();
    // const [leftMenuOpen, setLeftMenuOpen] = useState(true);


    return (
        <div className="absolute top-0 left-0 z-100 max-h-[calc(100%-32px)] overflow-y-auto max-w-50
        flex flex-col items-center justify-centers gap-4
        ">
            <Link href="./" className="w-fit h-fit p-5 flex items-center justify-center">
                <Image
                    src="/Logos/Logo.svg"
                    alt="Logo"
                    width={500}
                    height={500}
                    className={`h-auto ${windowSize === 'mobile' ? 'w-12' : 'w-20'}`}
                    priority
                />
            </Link>

            <BasemapSwitcher />
        </div>
    );
}