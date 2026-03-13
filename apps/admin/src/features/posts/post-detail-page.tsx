import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Circle, Send, Trash2, Facebook, Youtube, Link2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePost, useUpdatePostStatus } from "@/hooks/use-posts";
import { useRenders } from "@/hooks/use-renders";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  draft: [{ label: "Mark as Audio Pending", next: "audio_pending" }],
  audio_pending: [{ label: "Mark as Ready", next: "ready" }],
  ready: [{ label: "Start Rendering", next: "rendering" }],
  rendering: [{ label: "Mark as Rendered", next: "rendered" }],
  rendered: [{ label: "Publish", next: "published" }],
  published: [],
};

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  youtube: Youtube,
  tiktok: MessageCircle,
  linkedin: Link2,
  telegram: Send,
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("rf_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type SocialAccount = {
  id: string;
  provider: string;
  accountName: string;
};

type PublishingItem = {
  id: string;
  provider: string;
  accountName: string;
  status: string;
  scheduledAt: string;
  publishedAt: string | null;
  platformPostId: string | null;
  error: string | null;
};

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading, refetch } = usePost(id || "");
  const updateStatus = useUpdatePostStatus();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const { data: rendersData } = useRenders({ postId: id });
  const completedRenders = (rendersData?.items ?? []).filter(
    (r) => r.status === "completed",
  );

  const { data: publishingItems, refetch: refetchPublishing } = useQuery({
    queryKey: ["publishing", id],
    queryFn: () => api.get<PublishingItem[]>(`/api/publishing/post/${id}`),
    enabled: !!id,
  });

  async function handleStatusChange(nextStatus: string) {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ id, status: nextStatus });
      toast.success(`Status changed to ${nextStatus.replace("_", " ")}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  }

  async function handleAudioUpload(sceneId: string, file: File) {
    if (!id) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(
        `/api/posts/${id}/scenes/${sceneId}/audio`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        },
      );
      if (!resp.ok) throw new Error("Upload failed");
      toast.success("Audio uploaded.");
      refetch();
    } catch {
      toast.error("Failed to upload audio.");
    }
  }

  async function handleRemoveFromPlatform(publishingId: string) {
    try {
      await api.delete(`/api/publishing/${publishingId}`);
      toast.success("Removed from platform.");
      refetchPublishing();
    } catch {
      toast.error("Failed to remove.");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/content")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Content
        </Button>
        <p className="text-muted-foreground">Post not found.</p>
      </div>
    );
  }

  const scenes = post.scenes ?? [];
  const allHaveAudio = scenes.length > 0 && scenes.every((s) => s.audioUrl);
  const transitions = STATUS_TRANSITIONS[post.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/content")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>Template: {post.templateId}</span>
            <span>Format: {post.format}</span>
            <span>Theme: {post.theme}</span>
          </div>
        </div>
        <Badge
          variant={post.status === "draft" ? "secondary" : "default"}
          className={cn(
            "text-sm",
            post.status === "published" && "bg-green-600 hover:bg-green-700",
          )}
        >
          {post.status.replace("_", " ")}
        </Badge>
      </div>

      {transitions.length > 0 && (
        <div className="flex items-center gap-2">
          {transitions.map((t) => (
            <Button
              key={t.next}
              variant="outline"
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => handleStatusChange(t.next)}
            >
              {t.label}
            </Button>
          ))}
          {completedRenders.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setPublishDialogOpen(true)}
            >
              <Send className="mr-1 h-3 w-3" />
              Publish to Platforms
            </Button>
          )}
        </div>
      )}

      <Separator />

      {/* Publishing Status */}
      {publishingItems && publishingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Publishing Status</CardTitle>
            <CardDescription>
              Track where this content has been published or scheduled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {publishingItems.map((item) => {
                const Icon = PROVIDER_ICONS[item.provider] ?? Send;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium capitalize">
                          {item.provider}
                          {item.accountName && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              - {item.accountName}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.publishedAt
                            ? `Published ${new Date(item.publishedAt).toLocaleString()}`
                            : `Scheduled ${new Date(item.scheduledAt).toLocaleString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          item.status === "published"
                            ? "default"
                            : item.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className={cn(
                          item.status === "published" &&
                            "bg-green-600 hover:bg-green-600",
                        )}
                      >
                        {item.status}
                      </Badge>
                      {item.status !== "published" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveFromPlatform(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Scenes ({scenes.length})
            </CardTitle>
            {scenes.length > 0 && (
              <Badge variant={allHaveAudio ? "default" : "outline"}>
                {allHaveAudio
                  ? "All scenes have audio"
                  : `${scenes.filter((s) => s.audioUrl).length}/${scenes.length} with audio`}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {scenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scenes added yet.
            </p>
          ) : (
            <div className="space-y-4">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Circle
                        className={cn(
                          "h-3 w-3 fill-current",
                          scene.audioUrl
                            ? "text-green-500"
                            : "text-red-500",
                        )}
                      />
                      <span className="font-medium">
                        {scene.sortOrder + 1}. {scene.key}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {scene.entrance}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {scene.audioUrl ? (
                        <span className="text-xs text-muted-foreground">
                          {scene.durationSeconds
                            ? `${parseFloat(scene.durationSeconds).toFixed(1)}s`
                            : "Audio attached"}
                        </span>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            ref={(el) => {
                              fileInputRefs.current[scene.id] = el;
                            }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAudioUpload(scene.id, file);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              fileInputRefs.current[scene.id]?.click()
                            }
                          >
                            <Upload className="mr-1 h-3 w-3" />
                            Upload Audio
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Display:{" "}
                      </span>
                      {scene.displayText}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Narration:{" "}
                      </span>
                      {scene.narrationText}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {id && (
        <PublishDialog
          postId={id}
          completedRenders={completedRenders}
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          onSuccess={() => refetchPublishing()}
        />
      )}
    </div>
  );
}

function PublishDialog({
  postId,
  completedRenders,
  open,
  onOpenChange,
  onSuccess,
}: {
  postId: string;
  completedRenders: Array<{ id: string; format: string; postTitle: string | null }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [selectedRenderId, setSelectedRenderId] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ["social", "accounts"],
    queryFn: () => api.get<SocialAccount[]>("/api/social/accounts"),
    enabled: open,
  });

  const publishMutation = useMutation({
    mutationFn: (data: {
      postId: string;
      renderId: string;
      socialAccountIds: string[];
    }) => api.post("/api/publishing", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishing"] });
      onSuccess();
    },
  });

  function toggleAccount(id: string) {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  async function handlePublish() {
    if (!selectedRenderId || selectedAccounts.length === 0) return;
    try {
      await publishMutation.mutateAsync({
        postId,
        renderId: selectedRenderId,
        socialAccountIds: selectedAccounts,
      });
      toast.success(`Scheduled to ${selectedAccounts.length} platform(s)`);
      setSelectedRenderId("");
      setSelectedAccounts([]);
      onOpenChange(false);
    } catch {
      toast.error("Failed to schedule publishing");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish to Platforms</DialogTitle>
          <DialogDescription>
            Select a render and the platforms to publish to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Render</Label>
            <Select value={selectedRenderId} onValueChange={setSelectedRenderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select render" />
              </SelectTrigger>
              <SelectContent>
                {completedRenders.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.format} - {r.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Platforms ({selectedAccounts.length} selected)</Label>
            {!accounts || accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No social accounts connected. Go to Social to connect.
              </p>
            ) : (
              <div className="space-y-2 rounded-md border p-3">
                {accounts.map((account) => {
                  const Icon = PROVIDER_ICONS[account.provider] ?? Send;
                  return (
                    <label
                      key={account.id}
                      className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedAccounts.includes(account.id)}
                        onCheckedChange={() => toggleAccount(account.id)}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm capitalize">
                        {account.provider}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {account.accountName}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            disabled={
              !selectedRenderId ||
              selectedAccounts.length === 0 ||
              publishMutation.isPending
            }
            onClick={handlePublish}
          >
            {publishMutation.isPending
              ? "Publishing..."
              : `Publish to ${selectedAccounts.length} platform(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
