import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Film,
  Image,
  Play,
  RefreshCw,
  Send,
  Trash2,
  Loader2,
  Facebook,
  Youtube,
  Link2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRender, useCreateRender, useDeleteRender } from "@/hooks/use-renders";
import { useRenderSSE } from "@/hooks/use-sse";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PublishDialog } from "./publish-dialog";

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  youtube: Youtube,
  tiktok: MessageCircle,
  linkedin: Link2,
  telegram: Send,
};

type PublishingItem = {
  id: string;
  provider: string;
  accountName: string;
  status: string;
  scheduledAt: string;
  publishedAt: string | null;
  error: string | null;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDuration(ms: number | null) {
  if (!ms) return "--";
  const seconds = Math.round(ms / 1000);
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function formatLabel(format: string) {
  switch (format) {
    case "story": return "9:16";
    case "post": return "1:1";
    case "landscape": return "16:9";
    default: return format;
  }
}

async function downloadThumbnail(renderId: string) {
  const token = localStorage.getItem("rf_token");
  const res = await fetch(`/api/renders/${renderId}/thumbnail`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    toast.error("Thumbnail download failed");
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `thumbnail-${renderId}.jpg`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadRender(renderId: string) {
  const token = localStorage.getItem("rf_token");
  const res = await fetch(`/api/renders/${renderId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    toast.error("Download failed");
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `render-${renderId}.mp4`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function RenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: render, isLoading } = useRender(id || "");
  const sseProgress = useRenderSSE(
    render && (render.status === "rendering" || render.status === "queued") ? id : undefined,
  );
  const createRender = useCreateRender();
  const deleteRender = useDeleteRender();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const postId = render?.postId;
  const { data: publishingItems, refetch: refetchPublishing } = useQuery({
    queryKey: ["publishing", "render", id],
    queryFn: () => api.get<PublishingItem[]>(`/api/publishing/post/${postId}`),
    enabled: !!postId,
  });

  // Filter publishing items to those relevant to this render
  // (the API returns all for the post, but we show all for context)

  const status = sseProgress?.status ?? render?.status ?? "queued";
  const progress = sseProgress?.progress ?? render?.progress ?? 0;

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteRender.mutateAsync(id);
      toast.success("Render deleted");
      navigate("/renders");
    } catch {
      toast.error("Failed to delete render");
    }
  }

  async function handleRerender() {
    if (!render) return;
    try {
      await createRender.mutateAsync({ postId: render.postId, format: render.format });
      toast.success("New render queued");
    } catch {
      toast.error("Failed to queue render");
    }
  }

  async function handleRetryPublish(publishingId: string) {
    setRetryingIds((prev) => new Set(prev).add(publishingId));
    try {
      await api.post(`/api/publishing/${publishingId}/publish`);
      toast.success("Publish job re-queued");
      refetchPublishing();
    } catch {
      toast.error("Failed to retry publish");
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(publishingId);
        return next;
      });
    }
  }

  async function handleRemovePublishing(publishingId: string) {
    try {
      await api.delete(`/api/publishing/${publishingId}`);
      toast.success("Removed");
      refetchPublishing();
    } catch {
      toast.error("Failed to remove");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!render) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/renders")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Renders
        </Button>
        <p className="text-muted-foreground">Render not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/renders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {render.postTitle || "Untitled"} — {render.format} ({formatLabel(render.format)})
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>ID: {render.id.slice(0, 12)}...</span>
            <span>Created: {new Date(render.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <Badge
          variant={
            status === "completed" ? "default"
              : status === "failed" ? "destructive"
                : status === "rendering" ? "default"
                  : "secondary"
          }
          className={cn(
            "text-sm",
            status === "completed" && "bg-green-600 hover:bg-green-600",
            status === "rendering" && "bg-blue-600 hover:bg-blue-600",
          )}
        >
          {status}
        </Badge>
      </div>

      <Separator />

      {/* Progress bar for rendering */}
      {(status === "rendering" || status === "queued") && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {status === "queued" ? "Waiting to start..." : sseProgress?.message || "Rendering..."}
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Preview */}
      {status === "completed" && render.outputUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border bg-black">
              <video
                src={render.outputUrl}
                controls
                className="w-full max-h-[500px]"
                poster={render.thumbnailUrl ?? undefined}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {status === "failed" && render.error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="rounded bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">Render Failed</p>
              <p className="text-sm text-destructive/80 mt-1">{render.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details + Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Post</p>
                <button
                  className="font-medium hover:underline text-primary"
                  onClick={() => navigate(`/content/${render.postId}`)}
                >
                  {render.postTitle || render.postId.slice(0, 12) + "..."}
                </button>
              </div>
              <div>
                <p className="text-muted-foreground">Format</p>
                <p className="font-medium capitalize">{render.format} ({formatLabel(render.format)})</p>
              </div>
              <div>
                <p className="text-muted-foreground">File Size</p>
                <p className="font-medium">{formatSize(render.fileSize)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{formatDuration(render.durationMs)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Job ID</p>
                <p className="font-medium font-mono text-xs">{render.jobId ?? "--"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Render ID</p>
                <p className="font-medium font-mono text-xs">{render.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {status === "completed" && render.outputUrl && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <a href={render.outputUrl} target="_blank" rel="noopener noreferrer">
                      <Play className="mr-2 h-4 w-4" />
                      Open Video
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadRender(render.id)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPublishOpen(true)}>
                    <Send className="mr-2 h-4 w-4" />
                    Publish
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={createRender.isPending}
                onClick={handleRerender}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-render
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
            {render.thumbnailUrl && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Thumbnail</p>
                  <Button variant="ghost" size="sm" onClick={() => downloadThumbnail(render.id)}>
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                </div>
                <img
                  src={render.thumbnailUrl}
                  alt="Thumbnail"
                  className="rounded-lg border max-h-[200px] object-contain cursor-pointer"
                  onClick={() => downloadThumbnail(render.id)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Publishing Status */}
      {publishingItems && publishingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Publishing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {publishingItems.map((item) => {
                const Icon = PROVIDER_ICONS[item.provider] ?? Send;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-lg border p-3",
                      item.status === "failed" && "border-destructive/50 bg-destructive/5",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {item.provider}
                            {item.accountName && (
                              <span className="text-muted-foreground font-normal">
                                {" "}- {item.accountName}
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
                            item.status === "published" ? "default"
                              : item.status === "failed" ? "destructive"
                                : "secondary"
                          }
                          className={cn(
                            item.status === "published" && "bg-green-600 hover:bg-green-600",
                          )}
                        >
                          {item.status}
                        </Badge>
                        {item.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={retryingIds.has(item.id)}
                            onClick={() => handleRetryPublish(item.id)}
                          >
                            <RefreshCw className={cn("mr-1 h-3 w-3", retryingIds.has(item.id) && "animate-spin")} />
                            Retry
                          </Button>
                        )}
                        {item.status !== "published" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleRemovePublishing(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {item.status === "failed" && item.error && (
                      <div className="mt-2 rounded bg-destructive/10 px-3 py-2">
                        <p className="text-xs text-destructive">{item.error}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Render</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this render? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRender.isPending}
              onClick={handleDelete}
            >
              {deleteRender.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Dialog */}
      <PublishDialog
        renderIds={id ? [id] : []}
        open={publishOpen}
        onOpenChange={setPublishOpen}
        postId={render.postId}
      />
    </div>
  );
}
