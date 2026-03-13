import { useState } from "react";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { usePosts, useDeletePost } from "@/hooks/use-posts";
import { useNiches } from "@/hooks/use-niches";
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
  const [nicheFilter, setNicheFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const { data: nichesData } = useNiches();
  const { data, isLoading } = usePosts({
    nicheId: nicheFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    page,
  });
  const deletePost = useDeletePost();

  const nicheLookup = new Map(
    nichesData?.items?.map((n) => [n.id, n.name]) ?? [],
  );

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Niche</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.items?.length ? (
              data.items.map((post) => (
                <TableRow key={post.id}>
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
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No posts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
    </div>
  );
}
