"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";

// O hook não recebe mais os parâmetros direto na inicialização
export default function useUrlUpdater()
{
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Ele retorna esta função que será chamada onde você quiser (inclusive em eventos de clique)
    const updateUrl = (param: string, value: string) =>
    {
        const params = new URLSearchParams(searchParams.toString());
        params.set(param, value);

        router.push(`${pathname}?${params.toString()}`, {
            scroll: false
        });
    };

    return { updateUrl };
}


