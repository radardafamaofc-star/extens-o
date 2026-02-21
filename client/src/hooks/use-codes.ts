import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Types derived from API response schemas
export type ActivationCode = z.infer<typeof api.codes.list.responses[200]>[number];

export function useCodes() {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: [api.codes.list.path],
    queryFn: async () => {
      const res = await fetch(api.codes.list.path);
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch codes");
      return api.codes.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (daysValid: number = 30) => {
      const res = await fetch(api.codes.create.path, {
        method: api.codes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysValid }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create code");
      }
      
      return api.codes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.codes.list.path] });
      toast({
        title: "Success",
        description: "New activation code generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRevokeCode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.codes.revoke.path, { id });
      const res = await fetch(url, {
        method: api.codes.revoke.method,
      });

      if (!res.ok) {
        throw new Error("Failed to revoke code");
      }
      
      return api.codes.revoke.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.codes.list.path] });
      toast({
        title: "Revoked",
        description: "Activation code has been revoked.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
