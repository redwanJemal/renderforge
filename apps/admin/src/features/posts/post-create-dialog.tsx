import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNiches } from "@/hooks/use-niches";
import { useTemplates } from "@/hooks/use-templates";
import { useProjects } from "@/hooks/use-projects";
import { useCreatePost } from "@/hooks/use-posts";
import type { Scene } from "@/hooks/use-posts";
import { toast } from "sonner";

type SceneForm = {
  key: string;
  displayText: string;
  narrationText: string;
  entrance: string;
};

const FORMATS = ["story", "post", "landscape"] as const;
const THEMES = ["default", "dark", "vibrant", "minimal"] as const;
const ENTRANCES = ["fade", "slide", "scale"] as const;

function emptyScene(): SceneForm {
  return { key: "", displayText: "", narrationText: "", entrance: "fade" };
}

export function PostCreateDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [nicheId, setNicheId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [format, setFormat] = useState<string>("story");
  const [theme, setTheme] = useState<string>("default");
  const [scenes, setScenes] = useState<SceneForm[]>([emptyScene()]);

  const { data: projectsData } = useProjects();
  const { data: nichesData } = useNiches();
  const { data: templatesData } = useTemplates();
  const createPost = useCreatePost();

  function resetForm() {
    setTitle("");
    setProjectId("");
    setNicheId("");
    setTemplateId("");
    setFormat("story");
    setTheme("default");
    setScenes([emptyScene()]);
  }

  function updateScene(index: number, field: keyof SceneForm, value: string) {
    setScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }

  function addScene() {
    setScenes((prev) => [...prev, emptyScene()]);
  }

  function removeScene(index: number) {
    setScenes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !nicheId || !templateId.trim()) {
      toast.error("Please fill in title, niche, and template ID.");
      return;
    }

    const sceneData: Partial<Scene>[] = scenes
      .filter((s) => s.key.trim())
      .map((s, i) => ({
        sortOrder: i,
        key: s.key,
        displayText: s.displayText,
        narrationText: s.narrationText,
        entrance: s.entrance,
      }));

    try {
      await createPost.mutateAsync({
        title,
        nicheId,
        projectId: projectId || undefined,
        templateId,
        format,
        theme,
        scenes: sceneData,
      });
      toast.success("Post created successfully.");
      resetForm();
      setOpen(false);
    } catch {
      toast.error("Failed to create post.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title"
                />
              </div>

              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select value={projectId} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projectsData?.items?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Niche</Label>
                  <Select value={nicheId} onValueChange={setNicheId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select niche" />
                    </SelectTrigger>
                    <SelectContent>
                      {nichesData?.items?.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesData?.items?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THEMES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Scenes</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addScene}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Scene
                  </Button>
                </div>

                {scenes.map((scene, index) => (
                  <div
                    key={index}
                    className="rounded-lg border p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Scene {index + 1}
                      </span>
                      {scenes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeScene(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Key</Label>
                        <Input
                          value={scene.key}
                          onChange={(e) =>
                            updateScene(index, "key", e.target.value)
                          }
                          placeholder="scene_key"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Entrance</Label>
                        <Select
                          value={scene.entrance}
                          onValueChange={(v) =>
                            updateScene(index, "entrance", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ENTRANCES.map((e) => (
                              <SelectItem key={e} value={e}>
                                {e}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Display Text</Label>
                      <Textarea
                        value={scene.displayText}
                        onChange={(e) =>
                          updateScene(index, "displayText", e.target.value)
                        }
                        placeholder="Text shown on screen"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Narration Text</Label>
                      <Textarea
                        value={scene.narrationText}
                        onChange={(e) =>
                          updateScene(index, "narrationText", e.target.value)
                        }
                        placeholder="Text for TTS narration"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createPost.isPending}>
              {createPost.isPending ? "Creating..." : "Create Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
