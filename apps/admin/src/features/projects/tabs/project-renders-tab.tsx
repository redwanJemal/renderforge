import { useState } from "react";
import {
  Download, Loader2, RefreshCw, Trash2, Eye, ExternalLink, Play, MoreHorizontal, Send, Image,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { useRenders, useCreateRender, useDeleteRender, useBulkDeleteRenders, type Render } from "@/hooks/use-renders";
import { useAllRendersSSE } from "@/hooks/use-sse";
import { PublishDialog } from "@/features/renders/publish-dialog";
import { useNavigate } from "react-router-dom";

async function downloadRender(renderId: string) {
  const token = localStorage.getItem("rf_token");
  const res = await fetch(`/api/renders/${renderId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) { toast.error("Download failed"); return; }
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
];

function statusBadgeVariant(status: string) {
  switch (status) {
    case "completed": return "default" as const;
    case "failed": return "destructive" as const;
    case "rendering": return "default" as const;
    default: return "secondary" as const;
  }
}
function statusBadgeClass(status: string) {
  if (status === "rendering") return "bg-blue-600 hover:bg-blue-600";
  if (status === "completed") return "bg-green-600 hover:bg-green-600";
  return "";
}
function formatSize(bytes: number | null) {
  if (!bytes) return "--";
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatLabel(f: string) {
  switch (f) { case "story": return "9:16"; case "post": return "1:1"; case "landscape": return "16:9"; default: return f; }
}

interface ProjectRendersTabProps {
  projectId: string;
}

export function ProjectRendersTab({ projectId }: ProjectRendersTabProps) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<Render | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishIds, setPublishIds] = useState<string[]>([]);

  const { data, isLoading } = useRenders({
    projectId,
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
  const selectedCompleted = renderItems.filter((r) => selectedIds.has(r.id) && (progressMap[r.id]?.status ?? r.status) === "completed");

  function getProgress(r: Render) { return progressMap[r.id]?.progress ?? r.progress; }
  function getStatus(r: Render) { return progressMap[r.id]?.status ?? r.status; }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{data.total} render(s)</span>}
      </div>

      {someSelected && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
          {selectedCompleted.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={async () => { for (const r of selectedCompleted) if (r.outputUrl) await downloadRender(r.id); }}>
                <Download className="mr-2 h-4 w-4" />Download ({selectedCompleted.length})
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setPublishIds(selectedCompleted.map((r) => r.id)); setPublishOpen(true); }}>
                <Send className="mr-2 h-4 w-4" />Publish ({selectedCompleted.length})
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox checked={allSelected} onCheckedChange={() => setSelectedIds(allSelected ? new Set() : new Set(renderItems.map((r) => r.id)))} /></TableHead>
              <TableHead className="w-[50px]" />
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
                <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : renderItems.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No renders found.</TableCell></TableRow>
            ) : (
              renderItems.map((render) => {
                const status = getStatus(render);
                const progress = getProgress(render);
                return (
                  <TableRow key={render.id}>
                    <TableCell><Checkbox checked={selectedIds.has(render.id)} onCheckedChange={() => { setSelectedIds((p) => { const n = new Set(p); n.has(render.id) ? n.delete(render.id) : n.add(render.id); return n; }); }} /></TableCell>
                    <TableCell className="p-1">
                      {render.thumbnailUrl ? (
                        <img src={render.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Image className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px]">
                      <button className="text-left truncate block hover:underline text-primary" onClick={() => navigate(`/content/${render.postId}`)}>
                        {render.postTitle || render.postId.slice(0, 8) + "..."}
                      </button>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{render.format} ({formatLabel(render.format)})</Badge></TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(status)} className={statusBadgeClass(status)}>{status}</Badge></TableCell>
                    <TableCell>
                      {status === "rendering" ? (
                        <div className="flex items-center gap-2"><Progress value={progress} className="flex-1" /><span className="text-xs text-muted-foreground w-10 text-right">{Math.round(progress)}%</span></div>
                      ) : status === "completed" ? (
                        <span className="text-xs text-green-600 font-medium">Complete</span>
                      ) : status === "failed" ? (
                        <span className="text-xs text-destructive truncate block max-w-[180px]" title={render.error ?? ""}>{render.error || "Error"}</span>
                      ) : <span className="text-xs text-muted-foreground">Waiting...</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatSize(render.fileSize)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(render.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/renders/${render.id}`)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/content/${render.postId}`)}><ExternalLink className="mr-2 h-4 w-4" />View Post</DropdownMenuItem>
                          {status === "completed" && render.outputUrl && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild><a href={render.outputUrl} target="_blank" rel="noopener noreferrer"><Play className="mr-2 h-4 w-4" />Preview</a></DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadRender(render.id)}><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setPublishIds([render.id]); setPublishOpen(true); }}><Send className="mr-2 h-4 w-4" />Publish</DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => retryRender.mutateAsync({ postId: render.postId, format: render.format }).then(() => toast.success("Re-render queued")).catch(() => toast.error("Failed"))}>
                            <RefreshCw className="mr-2 h-4 w-4" />Re-render
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(render)}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
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

      {data && <TablePagination page={data.page} totalPages={data.totalPages} total={data.total} perPage={perPage} onPageChange={setPage} onPerPageChange={(v) => { setPerPage(v); setPage(1); }} />}

      <PublishDialog renderIds={publishIds} open={publishOpen} onOpenChange={setPublishOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Render</AlertDialogTitle>
            <AlertDialogDescription>Delete this render{deleteTarget?.postTitle ? ` for "${deleteTarget.postTitle}"` : ""}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={deleteRender.isPending} onClick={() => deleteTarget && deleteRender.mutateAsync(deleteTarget.id).then(() => { toast.success("Deleted"); setDeleteTarget(null); }).catch(() => toast.error("Failed"))}>
              {deleteRender.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {selectedIds.size} Render(s)</AlertDialogTitle>
            <AlertDialogDescription>Delete {selectedIds.size} selected render(s)?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={bulkDelete.isPending} onClick={() => bulkDelete.mutateAsync(Array.from(selectedIds)).then(() => { toast.success(`Deleted ${selectedIds.size}`); setSelectedIds(new Set()); setBulkDeleteOpen(false); }).catch(() => toast.error("Failed"))}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
