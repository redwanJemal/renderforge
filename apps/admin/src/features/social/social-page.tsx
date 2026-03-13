import { useState } from "react";
import { Share2, Link2, Unlink, Facebook, Youtube, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

function useDisconnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/social/disconnect/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social"] }),
  });
}

export function SocialPage() {
  const { data: accounts, isLoading } = useSocialAccounts();
  const disconnect = useDisconnectAccount();
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);

  const connectedMap = new Map(
    (accounts ?? []).map((a) => [a.provider, a]),
  );

  async function handleConnect(providerId: string) {
    if (providerId === "telegram") {
      setTelegramDialogOpen(true);
      return;
    }
    try {
      const result = await api.get<{ url: string }>(
        `/api/social/connect/${providerId}`,
      );
      if (result.url) {
        window.open(result.url, "_blank", "width=600,height=700");
      }
    } catch {
      toast.error(`Failed to connect ${providerId}`);
    }
  }

  async function handleDisconnect(id: string) {
    try {
      await disconnect.mutateAsync(id);
      toast.success("Account disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Share2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Social Accounts</h1>
      </div>

      <p className="text-muted-foreground">
        Connect your social media accounts to publish rendered videos directly
        from RenderForge.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const account = connectedMap.get(provider.id);
          const Icon = provider.icon;

          return (
            <Card key={provider.id}>
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${provider.color}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{provider.name}</CardTitle>
                  <CardDescription>
                    {account
                      ? account.accountName
                      : "Not connected"}
                  </CardDescription>
                </div>
                {account && (
                  <Badge
                    variant="default"
                    className="bg-green-600 hover:bg-green-600"
                  >
                    Connected
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : account ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Connected{" "}
                      {new Date(account.connectedAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={disconnect.isPending}
                    >
                      <Unlink className="mr-1 h-3 w-3" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleConnect(provider.id)}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect {provider.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TelegramConnectDialog
        open={telegramDialogOpen}
        onOpenChange={setTelegramDialogOpen}
      />
    </div>
  );
}

function TelegramConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const queryClient = useQueryClient();

  async function handleConnect() {
    if (!botToken || !channelId) return;
    setConnecting(true);
    try {
      await api.post("/api/social/connect/telegram", { botToken, channelId });
      toast.success("Telegram channel connected!");
      queryClient.invalidateQueries({ queryKey: ["social"] });
      setBotToken("");
      setChannelId("");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to connect Telegram",
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-sky-500" />
            Connect Telegram Channel
          </DialogTitle>
          <DialogDescription>
            Enter your Telegram bot token and channel ID. The bot must be an
            admin of the channel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Bot Token</Label>
            <Input
              id="bot-token"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              Get this from @BotFather on Telegram
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-id">Channel ID</Label>
            <Input
              id="channel-id"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="@yourchannel or -1001234567890"
            />
            <p className="text-xs text-muted-foreground">
              Use @username for public channels or numeric ID for private
            </p>
          </div>

          <Button
            className="w-full"
            disabled={!botToken || !channelId || connecting}
            onClick={handleConnect}
          >
            {connecting ? "Connecting..." : "Connect Channel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
