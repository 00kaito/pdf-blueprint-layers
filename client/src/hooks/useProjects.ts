import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Project, ProjectState } from "@shared/schema";

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

export function useSaveProject() {
  return useMutation({
    mutationFn: async ({ id, state }: { id: string; state: ProjectState }) => {
      await apiRequest("PUT", `/api/projects/${id}`, state);
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
  return useMutation({
    mutationFn: async ({ id, username }: { id: string; username: string }) => {
      await apiRequest("POST", `/api/projects/${id}/share`, { username });
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
