import { useState, useRef } from "react";
import {
  ImageIcon,
  Upload,
  Trash2,
  Search,
  Loader2,
  MoreHorizontal,
  Tag,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useImages,
  useUploadImage,
  useUpdateImage,
  useDeleteImage,
  type ImageLibraryItem,
} from "@/hooks/use-images";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "illustration", label: "Illustrations" },
  { value: "background", label: "Backgrounds" },
  { value: "character", label: "Characters" },
  { value: "icon", label: "Icons" },
  { value: "photo", label: "Photos" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageLibraryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(24);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ImageLibraryItem | null>(null);
  const [editTarget, setEditTarget] = useState<ImageLibraryItem | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ImageLibraryItem | null>(null);

  const filters = {
    category: category !== "all" ? category : undefined,
    search: search || undefined,
    page,
    perPage,
  };

  const { data, isLoading } = useImages(filters);
  const images = data?.items;
  const deleteImage = useDeleteImage();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Image Library</h1>
          {data && (
            <Badge variant="secondary">{data.total} images</Badge>
          )}
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : !images || images.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No images yet</p>
          <p className="text-sm mt-1">Upload illustrations to use in your bedtime stories.</p>
          <Button className="mt-4" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Your First Image
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              onPreview={() => setPreviewTarget(img)}
              onEdit={() => setEditTarget(img)}
              onDelete={() => setDeleteTarget(img)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
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

      {/* Upload Dialog */}
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      {/* Edit Dialog */}
      {editTarget && (
        <EditDialog
          image={editTarget}
          open={!!editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
        />
      )}

      {/* Preview Dialog */}
      {previewTarget && (
        <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewTarget.filename}</DialogTitle>
            </DialogHeader>
            <img
              src={previewTarget.url}
              alt={previewTarget.filename}
              className="w-full rounded-lg"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {previewTarget.width && previewTarget.height && (
                <span>{previewTarget.width}x{previewTarget.height}</span>
              )}
              <span>{formatFileSize(previewTarget.fileSize)}</span>
              {previewTarget.category && <Badge variant="outline">{previewTarget.category}</Badge>}
              {previewTarget.tags?.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.filename}"? This will remove it from S3 storage permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteImage.mutate(deleteTarget.id, {
                    onSuccess: () => {
                      toast.success("Image deleted");
                      setDeleteTarget(null);
                    },
                    onError: (err) => toast.error(err.message),
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Image Card ────────────────────────────────────────

function ImageCard({
  image,
  onPreview,
  onEdit,
  onDelete,
}: {
  image: ImageLibraryItem;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden">
      <div
        className="aspect-square bg-muted cursor-pointer"
        onClick={onPreview}
      >
        <img
          src={image.url}
          alt={image.filename}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-2">
        <p className="text-sm font-medium truncate" title={image.filename}>
          {image.filename}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(image.fileSize)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPreview}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(image.s3Key);
                  toast.success("S3 key copied");
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy S3 Key
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Tag className="h-4 w-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {image.category && (
          <Badge variant="outline" className="mt-1 text-xs">
            {image.category}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Upload Dialog ─────────────────────────────────────

function UploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const upload = useUploadImage();

  const handleUpload = async () => {
    if (files.length === 0) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      if (category) formData.append("category", category);
      if (tags) formData.append("tags", tags);
      if (description) formData.append("description", description);

      try {
        await upload.mutateAsync(formData);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    toast.success(`${files.length} image${files.length > 1 ? "s" : ""} uploaded`);
    setFiles([]);
    setCategory("");
    setTags("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = Array.from(e.dataTransfer.files).filter((f) =>
                f.type.startsWith("image/")
              );
              setFiles((prev) => [...prev, ...dropped]);
            }}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click or drag images here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPEG, WebP, GIF
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
          </div>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm px-2 py-1 bg-muted rounded">
                  <span className="truncate">{f.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="bear, forest, night"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={files.length === 0 || upload.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload {files.length > 0 ? `${files.length} Image${files.length > 1 ? "s" : ""}` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ───────────────────────────────────────

function EditDialog({
  image,
  open,
  onOpenChange,
}: {
  image: ImageLibraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [category, setCategory] = useState(image.category || "");
  const [tags, setTags] = useState(image.tags?.join(", ") || "");
  const [description, setDescription] = useState(image.description || "");
  const update = useUpdateImage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Image Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <img
              src={image.url}
              alt={image.filename}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div>
              <p className="font-medium">{image.filename}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(image.fileSize)}
              </p>
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              placeholder="bear, forest, night"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => {
              update.mutate(
                {
                  id: image.id,
                  category: category || undefined,
                  tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
                  description: description || undefined,
                },
                {
                  onSuccess: () => {
                    toast.success("Image updated");
                    onOpenChange(false);
                  },
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
            disabled={update.isPending}
          >
            {update.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
