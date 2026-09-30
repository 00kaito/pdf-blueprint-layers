import {useQuery, useMutation} from "@tanstack/react-query";
import {apiRequest, queryClient} from "@/lib/queryClient";

/** An icon of the shared library, with its image inlined once loaded. */
export type LibraryIcon = {
  id: string;
  name: string;
  url: string;
  /**
   * The image as a data URL. Placed objects get this, not the library URL, so they stay intact
   * when the icon is later deleted from the library (and in exports).
   */
  dataUrl: string;
};

const ICONS_KEY = ["/api/icons"];

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/** Team-wide icon library ("My Icons"), shared by all projects and kept until deleted by hand. */
export const useIconLibrary = () => {
  const query = useQuery({
    queryKey: ICONS_KEY,
    queryFn: async (): Promise<LibraryIcon[]> => {
      const res = await apiRequest("GET", "/api/icons");
      const icons = await res.json() as Omit<LibraryIcon, 'dataUrl'>[];
      return Promise.all(icons.map(async icon => {
        const file = await fetch(icon.url);
        return { ...icon, dataUrl: file.ok ? await blobToDataUrl(await file.blob()) : icon.url };
      }));
    },
    staleTime: Infinity,
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/icons", { method: "POST", body: form });
        if (!res.ok) throw new Error(await res.text());
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ICONS_KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/icons/${id}`); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ICONS_KEY }),
  });

  return { icons: query.data ?? [], isLoading: query.isLoading, upload, remove };
};

/** Data URL → File, for moving icons that older projects kept inline into the library. */
export const dataUrlToFile = async (dataUrl: string, name: string) => {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name || 'icon.png', { type: blob.type || 'image/png' });
};
