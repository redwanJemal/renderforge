import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Circle,
  Send,
  Trash2,
  Facebook,
  Youtube,
  Link2,
  MessageCircle,
  Film,
  Download,
  Play,
  RefreshCw,
  Image,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { usePost, useDeletePost } from "@/hooks/use-posts";
import { useRenders, useCreateRender, useDeleteRender, type Render } from "@/hooks/use-renders";
import { useAllRendersSSE } from "@/hooks/use-sse";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PublishDialog } from "@/features/renders/publish-dialog";

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  youtube: Youtube,
  tiktok: MessageCircle,
  linkedin: Link2,
  telegram: Send,
};

const FORMATS = [
  { value: "story", label: "Story (9:16)" },
  { value: "post", label: "Post (1:1)" },
  { value: "landscape", label: "Landscape (16:9)" },
];

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("rf_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

function formatSize(bytes: number | null) {
  if (!bytes) return "--";
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
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

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading, refetch } = usePost(id || "");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishRenderIds, setPublishRenderIds] = useState<string[]>([]);
  const [deleteRenderId, setDeleteRenderId] = useState<string | null>(null);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const { data: rendersData, refetch: refetchRenders } = useRenders({ postId: id });
  const renderItems = rendersData?.items ?? [];
  const completedRenders = renderItems.filter((r) => r.status === "completed");

  const progressMap = useAllRendersSSE();
  const createRender = useCreateRender();
  const deleteRender = useDeleteRender();
  const deletePost = useDeletePost();

  const { data: publishingItems, refetch: refetchPublishing } = useQuery({
    queryKey: ["publishing", id],
    queryFn: () => api.get<PublishingItem[]>(`/api/publishing/post/${id}`),
    enabled: !!id,
  });

  function getRenderStatus(render: Render) {
    const sse = progressMap[render.id];
    return sse ? sse.status : render.status;
  }

  function getRenderProgress(render: Render) {
    const sse = progressMap[render.id];
    return sse ? sse.progress : render.progress;
  }

  async function handleQueueRender(format: string) {
    if (!id) return;
    try {
      await createRender.mutateAsync({ postId: id, format });
      toast.success(`Queued ${format} render`);
      refetchRenders();
    } catch {
      toast.error("Failed to queue render");
    }
  }

  async function handleDeletePost() {
    if (!id) return;
    try {
      await deletePost.mutateAsync(id);
      toast.success("Post deleted");
      navigate("/content");
    } catch {
      toast.error("Failed to delete post");
    }
  }

  async function handleDeleteRender() {
    if (!deleteRenderId) return;
    try {
      await deleteRender.mutateAsync(deleteRenderId);
      toast.success("Render deleted");
      setDeleteRenderId(null);
      refetchRenders();
    } catch {
      toast.error("Failed to delete render");
    }
  }

  async function handleRerender(render: Render) {
    try {
      await createRender.mutateAsync({ postId: render.postId, format: render.format });
      toast.success("New render queued");
      refetchRenders();
    } catch {
      toast.error("Failed to queue render");
    }
  }

  function handlePublishRender(render: Render) {
    setPublishRenderIds([render.id]);
    setPublishDialogOpen(true);
  }

  async function handleAudioUpload(sceneId: string, file: File) {
    if (!id) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch(`/api/posts/${id}/scenes/${sceneId}/audio`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!resp.ok) throw new Error("Upload failed");
      toast.success("Audio uploaded.");
      refetch();
    } catch {
      toast.error("Failed to upload audio.");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/content")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>Template: {post.templateId}</span>
            <span>Format: {post.format}</span>
            <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <Badge
          variant={post.status === "draft" ? "secondary" : "default"}
          className={cn(
            "text-sm",
            post.status === "published" && "bg-green-600 hover:bg-green-700",
            post.status === "rendered" && "bg-green-600 hover:bg-green-700",
          )}
        >
          {post.status.replace("_", " ")}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={createRender.isPending}>
              <Film className="mr-2 h-4 w-4" />
              Render
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {FORMATS.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => handleQueueRender(f.value)}>
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="destructive"
          size="icon"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Renders Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Renders ({renderItems.length})</CardTitle>
            {completedRenders.length > 0 && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                {completedRenders.length} completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {renderItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No renders yet. Use the Render button above to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {renderItems.map((render) => {
                const status = getRenderStatus(render);
                const progress = getRenderProgress(render);

                return (
                  <div
                    key={render.id}
                    className="flex items-center gap-4 rounded-lg border p-3"
                  >
                    {/* Thumbnail */}
                    <div className="shrink-0">
                      {render.thumbnailUrl ? (
                        <img
                          src={render.thumbnailUrl}
                          alt=""
                          className="w-14 h-14 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded bg-muted flex items-center justify-center">
                          <Image className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">
                          {render.format}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {render.format === "story"
                            ? "9:16"
                            : render.format === "post"
                              ? "1:1"
                              : "16:9"}
                        </Badge>
                        <Badge
                          variant={
                            status === "completed"
                              ? "default"
                              : status === "failed"
                                ? "destructive"
                                : status === "rendering"
                                  ? "default"
                                  : "secondary"
                          }
                          className={cn(
                            status === "completed" && "bg-green-600 hover:bg-green-600",
                            status === "rendering" && "bg-blue-600 hover:bg-blue-600",
                          )}
                        >
                          {status}
                        </Badge>
                        {status === "completed" && render.fileSize && (
                          <span className="text-xs text-muted-foreground">
                            {formatSize(render.fileSize)}
                          </span>
                        )}
                      </div>

                      {status === "rendering" && (
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={progress} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      )}

                      {status === "failed" && render.error && (
                        <p className="text-xs text-destructive mt-1 truncate">
                          {render.error}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {status === "completed" && (
                        <>
                          {render.outputUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Preview"
                              asChild
                            >
                              <a href={render.outputUrl} target="_blank" rel="noopener noreferrer">
                                <Play className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Download"
                            onClick={() => downloadRender(render.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Publish"
                            onClick={() => handlePublishRender(render)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(status === "completed" || status === "failed") && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Re-render"
                            disabled={createRender.isPending}
                            onClick={() => handleRerender(render)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={() => setDeleteRenderId(render.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                            item.status === "published"
                              ? "default"
                              : item.status === "failed"
                                ? "destructive"
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
                            onClick={() => handleRemoveFromPlatform(item.id)}
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

      {/* Scenes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Scenes ({scenes.length})</CardTitle>
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
            <p className="text-sm text-muted-foreground">No scenes added yet.</p>
          ) : (
            <div className="space-y-4">
              {scenes.map((scene) => (
                <div key={scene.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Circle
                        className={cn(
                          "h-3 w-3 fill-current",
                          scene.audioUrl ? "text-green-500" : "text-red-500",
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
                            onClick={() => fileInputRefs.current[scene.id]?.click()}
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
                      <span className="font-medium text-muted-foreground">Display: </span>
                      {scene.displayText}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Narration: </span>
                      {scene.narrationText}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Post Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{post.title}&quot;? This will also delete all
              associated renders and scenes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePost.isPending}
              onClick={handleDeletePost}
            >
              {deletePost.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Render Dialog */}
      <AlertDialog
        open={!!deleteRenderId}
        onOpenChange={(open) => !open && setDeleteRenderId(null)}
      >
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
              onClick={handleDeleteRender}
            >
              {deleteRender.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Dialog */}
      <PublishDialog
        renderIds={publishRenderIds}
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        postId={id}
      />
    </div>
  );
}
