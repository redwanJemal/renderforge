import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { usePosts } from "@/hooks/use-posts";
import { useCreateRender, useCreateBatchRender } from "@/hooks/use-renders";
import { useBgmTracks } from "@/hooks/use-bgm";

const FORMATS = [
  { value: "story", label: "Story (9:16)" },
  { value: "post", label: "Post (1:1)" },
  { value: "landscape", label: "Landscape (16:9)" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewRenderDialog({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState("single");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Render</DialogTitle>
          <DialogDescription>
            Create a new video render from a content post.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1">
              Single
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex-1">
              Batch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <SingleRenderForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="batch" className="mt-4">
            <BatchRenderForm onSuccess={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SingleRenderForm({ onSuccess }: { onSuccess: () => void }) {
  const [postId, setPostId] = useState("");
  const [format, setFormat] = useState("");
  const [bgmTrackId, setBgmTrackId] = useState("");
  const { data: postsData, isLoading: postsLoading } = usePosts();
  const { data: bgmTracks, isLoading: bgmLoading } = useBgmTracks();
  const createRender = useCreateRender();

  const posts = postsData?.items ?? [];

  async function handleSubmit() {
    if (!postId || !format) return;
    try {
      await createRender.mutateAsync({
        postId,
        format,
        bgmTrackId: bgmTrackId && bgmTrackId !== "none" ? bgmTrackId : undefined,
      });
      toast.success("Render job created");
      onSuccess();
    } catch {
      toast.error("Failed to create render");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Post</Label>
        {postsLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={postId} onValueChange={setPostId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a post" />
            </SelectTrigger>
            <SelectContent>
              {posts.map((post) => (
                <SelectItem key={post.id} value={post.id}>
                  {post.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label>Format</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
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

      <div className="space-y-2">
        <Label>Background Music (optional)</Label>
        {bgmLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={bgmTrackId} onValueChange={setBgmTrackId}>
            <SelectTrigger>
              <SelectValue placeholder="No BGM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No BGM</SelectItem>
              {(bgmTracks ?? []).map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name} ({Math.round(Number(track.durationSeconds))}s)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Button
        className="w-full"
        disabled={!postId || !format || createRender.isPending}
        onClick={handleSubmit}
      >
        {createRender.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create Render"
        )}
      </Button>
    </div>
  );
}

function BatchRenderForm({ onSuccess }: { onSuccess: () => void }) {
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [bgmTrackId, setBgmTrackId] = useState("");
  const { data: postsData, isLoading: postsLoading } = usePosts();
  const { data: bgmTracks, isLoading: bgmLoading } = useBgmTracks();
  const batchRender = useCreateBatchRender();

  const posts = postsData?.items ?? [];

  function togglePost(id: string) {
    setSelectedPosts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function toggleFormat(value: string) {
    setSelectedFormats((prev) =>
      prev.includes(value)
        ? prev.filter((f) => f !== value)
        : [...prev, value],
    );
  }

  async function handleSubmit() {
    if (selectedPosts.length === 0 || selectedFormats.length === 0) return;
    try {
      await batchRender.mutateAsync({
        postIds: selectedPosts,
        formats: selectedFormats,
        bgmTrackId: bgmTrackId && bgmTrackId !== "none" ? bgmTrackId : undefined,
      });
      toast.success(
        `Batch render created: ${selectedPosts.length} posts x ${selectedFormats.length} formats`,
      );
      onSuccess();
    } catch {
      toast.error("Failed to create batch render");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Posts ({selectedPosts.length} selected)</Label>
        {postsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
            {posts.map((post) => (
              <label
                key={post.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPosts.includes(post.id)}
                  onChange={() => togglePost(post.id)}
                  className="rounded border-input"
                />
                <span className="truncate">{post.title}</span>
              </label>
            ))}
            {posts.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">
                No posts available
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Formats ({selectedFormats.length} selected)</Label>
        <div className="flex gap-2">
          {FORMATS.map((f) => (
            <Button
              key={f.value}
              type="button"
              variant={selectedFormats.includes(f.value) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFormat(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Background Music (optional)</Label>
        {bgmLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={bgmTrackId} onValueChange={setBgmTrackId}>
            <SelectTrigger>
              <SelectValue placeholder="No BGM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No BGM</SelectItem>
              {(bgmTracks ?? []).map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name} ({Math.round(Number(track.durationSeconds))}s)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Button
        className="w-full"
        disabled={
          selectedPosts.length === 0 ||
          selectedFormats.length === 0 ||
          batchRender.isPending
        }
        onClick={handleSubmit}
      >
        {batchRender.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating batch...
          </>
        ) : (
          `Render ${selectedPosts.length} post${selectedPosts.length !== 1 ? "s" : ""} x ${selectedFormats.length} format${selectedFormats.length !== 1 ? "s" : ""}`
        )}
      </Button>
    </div>
  );
}
