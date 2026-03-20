import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider } from "jotai";
import { ReactNode, useEffect, useState } from "react";

import { apiConfig } from "@/src/config/api-config";

type MobileRuntimeProviderProps = {
  children: ReactNode;
};

export function MobileRuntimeProvider({
  children,
}: MobileRuntimeProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    console.info(`[mobile] API base URL: ${apiConfig.baseUrl}`);
  }, []);

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </JotaiProvider>
  );
}
