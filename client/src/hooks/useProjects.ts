import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Project, ProjectState } from "@shared/schema";
import { getRevision, setBase } from "../lib/live-revision";
import { toSyncedDoc } from "../lib/merge-state";

/** A save based on an older plan: the server's current plan, to merge with and save again. */
export type SaveConflict = { revision: number; state: Record<string, any> };

export function useProjectList() {
  return useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return await res.json() as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

/**
 * Saves the plan, saying which revision it was made on. When someone saved in between, nothing is
 * written and the result is the conflict (their plan) — merge it (useRemoteMerge) and save again.
 */
export function useSaveProject() {
  return useMutation({
    mutationFn: async ({ id, state }: { id: string; state: ProjectState }): Promise<{ conflict?: SaveConflict }> => {
      const base = getRevision(id);
      try {
        const res = await apiRequest("PUT", `/api/projects/${id}${base !== undefined ? `?base=${base}` : ""}`, state);
        const body = await res.json().catch(() => ({}));
        // Our own save is not news for the live sync; it is the new common plan.
        if (typeof body.revision === "number") setBase(id, body.revision, toSyncedDoc(state));
        return {};
      } catch (e: any) {
        const text = String(e?.message ?? "");
        if (!text.startsWith("409:")) throw e;
        const body = JSON.parse(text.slice(4).trim());
        return { conflict: { revision: body.revision, state: body.state ?? {} } };
      }
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useShareProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, username }: { id: string; username: string }) => {
      await apiRequest("POST", `/api/projects/${id}/share`, { username });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useRenameProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await apiRequest("PATCH", `/api/projects/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, projectId }: { file: File; projectId?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (projectId) formData.append("projectId", projectId.toString());
      
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      return await res.json() as { fileId: string; url: string };
    },
  });
}
