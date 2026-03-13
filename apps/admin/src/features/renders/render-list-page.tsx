import { useState } from "react";
import {
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Film,
  Trash2,
  Eye,
  ExternalLink,
  Play,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useRenders, useCreateRender, useDeleteRender, type Render } from "@/hooks/use-renders";
import { useAllRendersSSE } from "@/hooks/use-sse";
import { NewRenderDialog } from "./new-render-dialog";
import { useNavigate } from "react-router-dom";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "queued", label: "Queued" },
  { value: "rendering", label: "Rendering" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

function statusBadgeVariant(status: string) {
  switch (status) {
    case "queued":
      return "secondary" as const;
    case "rendering":
      return "default" as const;
    case "completed":
      return "default" as const;
    case "failed":
      return "destructive" as const;
    case "cancelled":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "rendering":
      return "bg-blue-600 hover:bg-blue-600";
    case "completed":
      return "bg-green-600 hover:bg-green-600";
    default:
      return "";
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
    case "story":
      return "9:16";
    case "post":
      return "1:1";
    case "landscape":
      return "16:9";
    default:
      return format;
  }
}

export function RenderListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailRender, setDetailRender] = useState<Render | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Render | null>(null);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useRenders({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
  });

  const retryRender = useCreateRender();
  const deleteRender = useDeleteRender();
  const progressMap = useAllRendersSSE();

  const renders = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  function getProgress(render: Render) {
    const sse = progressMap[render.id];
    if (sse) return sse.progress;
    return render.progress;
  }

  function getStatus(render: Render) {
    const sse = progressMap[render.id];
    if (sse) return sse.status;
    return render.status;
  }

  async function handleDelete(render: Render) {
    try {
      await deleteRender.mutateAsync(render.id);
      toast.success("Render deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete render");
    }
  }

  async function handleRerender(render: Render) {
    try {
      await retryRender.mutateAsync({ postId: render.postId, format: render.format });
      toast.success("New render job created");
    } catch {
      toast.error("Failed to create render");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Renders</h1>
          {data && (
            <Badge variant="secondary" className="text-xs">
              {data.total} total
            </Badge>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Render
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Post</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[200px]">Progress</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Failed to load renders. Please try again.
                </TableCell>
              </TableRow>
            ) : renders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No renders found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              renders.map((render) => {
                const status = getStatus(render);
                const progress = getProgress(render);

                return (
                  <TableRow key={render.id}>
                    <TableCell className="font-medium max-w-[200px]">
                      <button
                        className="text-left truncate block hover:underline text-primary"
                        onClick={() => navigate(`/content/${render.postId}`)}
                      >
                        {render.postTitle || render.postId.slice(0, 8) + "..."}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {render.format} ({formatLabel(render.format)})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusBadgeVariant(status)}
                        className={statusBadgeClass(status)}
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {status === "rendering" ? (
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      ) : status === "completed" ? (
                        <span className="text-xs text-green-600 font-medium">
                          Complete
                        </span>
                      ) : status === "failed" ? (
                        <span className="text-xs text-destructive truncate block max-w-[180px]" title={render.error ?? ""}>
                          {render.error || "Error"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Waiting...</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSize(render.fileSize)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(render.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailRender(render)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/content/${render.postId}`)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Post
                          </DropdownMenuItem>
                          {status === "completed" && render.outputUrl && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <a href={render.outputUrl} target="_blank" rel="noopener noreferrer">
                                  <Play className="mr-2 h-4 w-4" />
                                  Preview Video
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`/api/renders/${render.id}/download`} download>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </a>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={retryRender.isPending}
                            onClick={() => handleRerender(render)}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Re-render
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(render)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <NewRenderDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Render Detail Dialog */}
      <Dialog open={!!detailRender} onOpenChange={(open) => !open && setDetailRender(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Render Details</DialogTitle>
          </DialogHeader>
          {detailRender && (
            <div className="space-y-4">
              {detailRender.outputUrl && (
                <div className="rounded-lg overflow-hidden border bg-black">
                  <video
                    src={detailRender.outputUrl}
                    controls
                    className="w-full max-h-[300px]"
                    poster=""
                  />
                </div>
              )}
              {!detailRender.outputUrl && getStatus(detailRender) === "completed" && (
                <div className="rounded-lg border bg-muted/50 p-6 text-center">
                  <Film className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Render completed but no output file was generated.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This happens when the Remotion renderer is not configured.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Post</p>
                  <button
                    className="font-medium hover:underline text-primary"
                    onClick={() => {
                      setDetailRender(null);
                      navigate(`/content/${detailRender.postId}`);
                    }}
                  >
                    {detailRender.postTitle || detailRender.postId.slice(0, 12) + "..."}
                  </button>
                </div>
                <div>
                  <p className="text-muted-foreground">Format</p>
                  <p className="font-medium capitalize">{detailRender.format} ({formatLabel(detailRender.format)})</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={statusBadgeVariant(getStatus(detailRender))}
                    className={statusBadgeClass(getStatus(detailRender))}
                  >
                    {getStatus(detailRender)}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Progress</p>
                  <p className="font-medium">{Math.round(getProgress(detailRender))}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">File Size</p>
                  <p className="font-medium">{formatSize(detailRender.fileSize)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{formatDuration(detailRender.durationMs)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Job ID</p>
                  <p className="font-medium font-mono text-xs">{detailRender.jobId ?? "--"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(detailRender.createdAt)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Render ID</p>
                  <p className="font-medium font-mono text-xs">{detailRender.id}</p>
                </div>
                {detailRender.error && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Error</p>
                    <p className="font-medium text-destructive text-xs">{detailRender.error}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                {detailRender.outputUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/renders/${detailRender.id}/download`} download>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={retryRender.isPending}
                  onClick={() => {
                    handleRerender(detailRender);
                    setDetailRender(null);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-render
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setDetailRender(null);
                    setDeleteTarget(detailRender);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Render</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this render
              {deleteTarget?.postTitle ? ` for "${deleteTarget.postTitle}"` : ""}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRender.isPending}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {deleteRender.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
