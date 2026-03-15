import { useState } from "react";
import { Link2, Unlink, Facebook, Youtube, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLinkSocialAccount, useUnlinkSocialAccount } from "@/hooks/use-projects";
import { toast } from "sonner";

type SocialAccount = {
  id: string;
  provider: string;
  accountName: string;
  connectedAt: string;
  expiresAt: string | null;
};

const PROVIDERS = [
  { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600" },
  { id: "youtube", name: "YouTube", icon: Youtube, color: "bg-red-600" },
  { id: "tiktok", name: "TikTok", icon: MessageCircle, color: "bg-black" },
  { id: "linkedin", name: "LinkedIn", icon: Link2, color: "bg-blue-700" },
  { id: "telegram", name: "Telegram", icon: Send, color: "bg-sky-500" },
];

function useSocialAccounts() {
  return useQuery({
    queryKey: ["social", "accounts"],
    queryFn: () => api.get<SocialAccount[]>("/api/social/accounts"),
  });
}

function useConnectSocialAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { provider: string; botToken?: string; channelId?: string }) =>
      api.post(`/api/social/connect/${data.provider}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social"] }),
  });
}

interface ProjectAccountsTabProps {
  projectId: string;
  linkedAccounts: Array<{
    id: string;
    socialAccountId: string;
    provider: string;
    accountName: string | null;
  }>;
}

export function ProjectAccountsTab({ projectId, linkedAccounts }: ProjectAccountsTabProps) {
  const { data: allAccounts, isLoading } = useSocialAccounts();
  const linkAccount = useLinkSocialAccount();
  const unlinkAccount = useUnlinkSocialAccount();
  const [telegramOpen, setTelegramOpen] = useState(false);

  const linkedIds = new Set(linkedAccounts.map((a) => a.socialAccountId));

  async function handleLink(socialAccountId: string) {
    try {
      await linkAccount.mutateAsync({ projectId, socialAccountId });
      toast.success("Account linked to project");
    } catch {
      toast.error("Failed to link account");
    }
  }

  async function handleUnlink(socialAccountId: string) {
    try {
      await unlinkAccount.mutateAsync({ projectId, socialAccountId });
      toast.success("Account unlinked");
    } catch {
      toast.error("Failed to unlink account");
    }
  }

  async function handleConnect(providerId: string) {
    if (providerId === "telegram") {
      setTelegramOpen(true);
      return;
    }
    try {
      const result = await api.get<{ url: string }>(`/api/social/connect/${providerId}`);
      if (result.url) window.open(result.url, "_blank", "width=600,height=700");
    } catch {
      toast.error(`Failed to connect ${providerId}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">Linked to this project</h3>
        <p className="text-xs text-muted-foreground">These accounts can be used for publishing content from this project.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-9 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const account = (allAccounts ?? []).find((a) => a.provider === provider.id);
            const isLinked = account ? linkedIds.has(account.id) : false;

            return (
              <Card key={provider.id}>
                <CardHeader className="flex flex-row items-center gap-4 pb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${provider.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <CardDescription>{account ? account.accountName : "Not connected"}</CardDescription>
                  </div>
                  {isLinked && <Badge className="bg-green-600">Linked</Badge>}
                  {account && !isLinked && <Badge variant="outline">Available</Badge>}
                </CardHeader>
                <CardContent>
                  {!account ? (
                    <Button variant="outline" className="w-full" onClick={() => handleConnect(provider.id)}>
                      <Link2 className="mr-2 h-4 w-4" />Connect {provider.name}
                    </Button>
                  ) : isLinked ? (
                    <Button variant="outline" className="w-full" onClick={() => handleUnlink(account.id)} disabled={unlinkAccount.isPending}>
                      <Unlink className="mr-2 h-4 w-4" />Unlink from Project
                    </Button>
                  ) : (
                    <Button variant="default" className="w-full" onClick={() => handleLink(account.id)} disabled={linkAccount.isPending}>
                      <Link2 className="mr-2 h-4 w-4" />Link to Project
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TelegramConnectDialog open={telegramOpen} onOpenChange={setTelegramOpen} />
    </div>
  );
}

function TelegramConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const queryClient = useQueryClient();

  async function handleConnect() {
    if (!botToken || !channelId) return;
    setConnecting(true);
    try {
      await api.post("/api/social/connect/telegram", { botToken, channelId });
      toast.success("Telegram connected!");
      queryClient.invalidateQueries({ queryKey: ["social"] });
      setBotToken(""); setChannelId("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    } finally { setConnecting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-sky-500" />Connect Telegram</DialogTitle>
          <DialogDescription>Enter your bot token and channel ID.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Bot Token</Label>
            <Input value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC-DEF..." type="password" />
          </div>
          <div className="space-y-2">
            <Label>Channel ID</Label>
            <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="@channel or -100..." />
          </div>
          <Button className="w-full" disabled={!botToken || !channelId || connecting} onClick={handleConnect}>
            {connecting ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
