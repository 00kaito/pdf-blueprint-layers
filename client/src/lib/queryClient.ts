import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  customSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const signal = customSignal || controller.signal;
  
  // Increased timeout to 60 seconds for mobile/large payloads, unless custom signal is provided
  const timeoutDuration = customSignal ? 0 : 60000;
  let timeoutId: any = null;

  if (timeoutDuration > 0) {
    timeoutId = setTimeout(() => {
      console.warn(`[API] Request to ${url} timed out after ${timeoutDuration}ms`);
      controller.abort();
    }, timeoutDuration);
  }

  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal,
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`[API] Request to ${url} was aborted (timeout or manual)`);
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/");
    console.log(`[Query] Fetching: ${url}`);
    
    const controller = new AbortController();
    // Default GET timeout of 15 seconds
    const id = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url as string, {
        credentials: "include",
        signal: controller.signal,
      });

      console.log(`[Query] Response: ${url} (${res.status})`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`[Query] Error: ${url}`, error);
      throw error;
    } finally {
      clearTimeout(id);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
