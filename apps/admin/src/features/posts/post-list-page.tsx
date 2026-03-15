import { useState } from "react";
import { Pencil, Trash2, Film, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePosts, useDeletePost } from "@/hooks/use-posts";
import { useCreateBatchRender } from "@/hooks/use-renders";
import { useNiches } from "@/hooks/use-niches";
import { useProjects } from "@/hooks/use-projects";
import { PostCreateDialog } from "./post-create-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "audio_pending", label: "Audio Pending" },
  { value: "ready", label: "Ready" },
  { value: "rendering", label: "Rendering" },
  { value: "rendered", label: "Rendered" },
  { value: "published", label: "Published" },
] as const;

const FORMATS = [
  { value: "story", label: "Story (9:16)" },
  { value: "post", label: "Post (1:1)" },
  { value: "landscape", label: "Landscape (16:9)" },
];

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "draft":
      return "secondary";
    case "audio_pending":
      return "outline";
    default:
      return "default";
  }
}

function statusBadgeClass(status: string): string {
  if (status === "published") {
    return "bg-green-600 hover:bg-green-700";
  }
  return "";
}

export function PostListPage() {
  const navigate = useNavigate();
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [nicheFilter, setNicheFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [renderFormatOpen, setRenderFormatOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("story");

  const { data: projectsData } = useProjects();
  const { data: nichesData } = useNiches();
  const { data, isLoading } = usePosts({
    projectId: projectFilter || undefined,
    nicheId: nicheFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    perPage,
  });
  const deletePost = useDeletePost();
  const batchRender = useCreateBatchRender();

  const nicheLookup = new Map(
    nichesData?.items?.map((n) => [n.id, n.name]) ?? [],
  );

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((p) => p.id)));
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

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deletePost.mutateAsync(deleteTarget.id);
      toast.success("Post deleted.");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete post.");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    let deleted = 0;
    for (const id of ids) {
      try {
        await deletePost.mutateAsync(id);
        deleted++;
      } catch {
        // continue
      }
    }
    toast.success(`Deleted ${deleted} post(s)`);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  }

  async function handleBulkRender() {
    try {
      await batchRender.mutateAsync({
        postIds: Array.from(selectedIds),
        formats: [selectedFormat],
      });
      toast.success(`Queued ${selectedIds.size} render(s)`);
      setRenderFormatOpen(false);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to queue renders");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content</h1>
          <p className="text-muted-foreground">
            Manage posts, scenes, and audio.
          </p>
        </div>
        <PostCreateDialog />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={projectFilter}
          onValueChange={(v) => {
            setProjectFilter(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectsData?.items?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={nicheFilter}
          onValueChange={(v) => {
            setNicheFilter(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Niches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Niches</SelectItem>
            {nichesData?.items?.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search posts..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-[240px]"
        />
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRenderFormatOpen(true)}>
            <Film className="mr-2 h-4 w-4" />
            Render Selected
          </Button>
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
              <TableHead>Title</TableHead>
              <TableHead>Niche</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Renders</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length > 0 ? (
              items.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(post.id)}
                      onCheckedChange={() => toggleSelect(post.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>
                    {nicheLookup.get(post.nicheId) || post.nicheId}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusBadgeVariant(post.status)}
                      className={statusBadgeClass(post.status)}
                    >
                      {post.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{post.format}</TableCell>
                  <TableCell>
                    {post.renderCounts && post.renderCounts.total > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        {post.renderCounts.completed > 0 && (
                          <span className="flex items-center gap-0.5 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            {post.renderCounts.completed}
                          </span>
                        )}
                        {post.renderCounts.rendering > 0 && (
                          <span className="flex items-center gap-0.5 text-blue-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {post.renderCounts.rendering}
                          </span>
                        )}
                        {post.renderCounts.failed > 0 && (
                          <span className="flex items-center gap-0.5 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            {post.renderCounts.failed}
                          </span>
                        )}
                        {post.renderCounts.queued > 0 && (
                          <span className="text-muted-foreground">
                            +{post.renderCounts.queued} queued
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/content/${post.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteTarget({ id: post.id, title: post.title })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No posts found.
                </TableCell>
              </TableRow>
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

      {/* Single Delete Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Post(s)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {selectedIds.size} selected post(s)?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render Format Picker */}
      <Dialog open={renderFormatOpen} onOpenChange={setRenderFormatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Render {selectedIds.size} Post(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select output format:</p>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenderFormatOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkRender} disabled={batchRender.isPending}>
              {batchRender.isPending ? "Queuing..." : "Start Renders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
