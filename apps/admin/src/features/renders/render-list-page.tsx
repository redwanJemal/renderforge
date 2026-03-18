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
  Send,
  Image,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { useRenders, useCreateRender, useDeleteRender, useBulkDeleteRenders, type Render } from "@/hooks/use-renders";
import { useAllRendersSSE } from "@/hooks/use-sse";
import { NewRenderDialog } from "./new-render-dialog";
import { PublishDialog } from "./publish-dialog";
import { useNavigate } from "react-router-dom";

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
  const [perPage, setPerPage] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Render | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishIds, setPublishIds] = useState<string[]>([]);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useRenders({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    perPage,
  });

  const retryRender = useCreateRender();
  const deleteRender = useDeleteRender();
  const bulkDelete = useBulkDeleteRenders();
  const progressMap = useAllRendersSSE();

  const renderItems = data?.items ?? [];

  const allSelected = renderItems.length > 0 && renderItems.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;
  const selectedCompleted = renderItems.filter(
    (r) => selectedIds.has(r.id) && getStatus(r) === "completed",
  );

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(renderItems.map((r) => r.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  async function handleBulkDelete() {
    try {
      await bulkDelete.mutateAsync(Array.from(selectedIds));
      toast.success(`Deleted ${selectedIds.size} render(s)`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch {
      toast.error("Failed to delete renders");
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

  async function handleBulkDownload() {
    for (const render of selectedCompleted) {
      if (render.outputUrl) {
        await downloadRender(render.id);
      }
    }
  }

  function handlePublishSelected() {
    const ids = selectedCompleted.map((r) => r.id);
    if (ids.length === 0) {
      toast.error("No completed renders selected");
      return;
    }
    setPublishIds(ids);
    setPublishOpen(true);
  }

  function handlePublishSingle(render: Render) {
    setPublishIds([render.id]);
    setPublishOpen(true);
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

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
          {selectedCompleted.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleBulkDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download ({selectedCompleted.length})
              </Button>
              <Button variant="outline" size="sm" onClick={handlePublishSelected}>
                <Send className="mr-2 h-4 w-4" />
                Publish ({selectedCompleted.length})
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Failed to load renders. Please try again.
                </TableCell>
              </TableRow>
            ) : renderItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No renders found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              renderItems.map((render) => {
                const status = getStatus(render);
                const progress = getProgress(render);

                return (
                  <TableRow key={render.id} data-selected={selectedIds.has(render.id) || undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(render.id)}
                        onCheckedChange={() => toggleSelect(render.id)}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      {render.thumbnailUrl ? (
                        <img
                          src={render.thumbnailUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => navigate(`/renders/${render.id}`)}>
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
                              <DropdownMenuItem onClick={() => downloadRender(render.id)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePublishSingle(render)}>
                                <Send className="mr-2 h-4 w-4" />
                                Publish
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

      {data && (
        <TablePagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
        />
      )}

      <NewRenderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <PublishDialog renderIds={publishIds} open={publishOpen} onOpenChange={setPublishOpen} />

      {/* Delete Confirmation (single) */}
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Render(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected render(s)?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDelete.isPending}
              onClick={handleBulkDelete}
            >
              {bulkDelete.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
