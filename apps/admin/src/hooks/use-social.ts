import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type SocialAccount = {
  id: string;
  provider: string;
  accountName: string;
  connectedAt: string;
  expiresAt: string | null;
};

export function useSocialAccounts() {
  return useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => api.get<SocialAccount[]>("/api/social/accounts"),
  });
}
