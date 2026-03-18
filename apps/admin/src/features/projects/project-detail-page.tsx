import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { ScheduleEditor } from "./schedule-editor";
import { ProjectContentTab } from "./tabs/project-content-tab";
import { ProjectRendersTab } from "./tabs/project-renders-tab";
import { ProjectCalendarTab } from "./tabs/project-calendar-tab";
import { ProjectAccountsTab } from "./tabs/project-accounts-tab";
import { toast } from "sonner";

const SOCIAL_PLATFORMS = ["tiktok", "youtube", "instagram", "facebook", "linkedin", "telegram"] as const;

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const { data: project, isLoading } = useProject(id!);
  const updateProject = useUpdateProject();

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "paused" | "archived">("active");
  const [editVoiceId, setEditVoiceId] = useState("");
  const [editEnableIntro, setEditEnableIntro] = useState(true);
  const [editEnableOutro, setEditEnableOutro] = useState(true);
  const [editHandles, setEditHandles] = useState<Record<string, string>>({});
  const [editPalette, setEditPalette] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  if (project && !initialized) {
    setEditName(project.name);
    setEditSlug(project.slug);
    setEditDescription(project.description ?? "");
    setEditLogoUrl(project.logoUrl ?? "");
    setEditStatus(project.status);
    setEditVoiceId(project.defaultVoiceId ?? "");
    setEditEnableIntro(project.enableIntro ?? true);
    setEditEnableOutro(project.enableOutro ?? true);
    setEditHandles(project.socialHandles ?? {});
    setEditPalette(project.colorPalette ?? {});
    setInitialized(true);
  }

  function setTab(tab: string) {
    setSearchParams({ tab });
  }

  async function handleSave() {
    try {
      await updateProject.mutateAsync({
        id: id!,
        name: editName,
        slug: editSlug,
        description: editDescription || null,
        logoUrl: editLogoUrl || null,
        status: editStatus,
        defaultVoiceId: editVoiceId || null,
        enableIntro: editEnableIntro,
        enableOutro: editEnableOutro,
        socialHandles: editHandles,
        colorPalette: editPalette,
      });
      toast.success("Project updated");
    } catch {
      toast.error("Failed to update project");
    }
  }

  function setHandle(platform: string, value: string) {
    setEditHandles((prev) => ({ ...prev, [platform]: value }));
  }

  function setPaletteColor(key: string, value: string) {
    setEditPalette((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-12 text-muted-foreground">Project not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{project.slug}</p>
        </div>
        <Badge className={project.status === "active" ? "bg-green-600" : project.status === "paused" ? "bg-yellow-500" : "bg-gray-500"}>
          {project.status}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content ({project.postCount ?? 0})</TabsTrigger>
          <TabsTrigger value="renders">Renders</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="schedules">Schedules ({project.schedules.length})</TabsTrigger>
          <TabsTrigger value="social">Social Handles</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="accounts">Accounts ({project.linkedSocialAccounts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as typeof editStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Voice ID</Label>
                  <Input value={editVoiceId} onChange={(e) => setEditVoiceId(e.target.value)} placeholder="e.g. qwen-tts-v1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo URL (S3 key)</Label>
                <Input value={editLogoUrl} onChange={(e) => setEditLogoUrl(e.target.value)} placeholder="logos/my-project.png" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Enable Intro</Label>
                    <p className="text-xs text-muted-foreground">Show branded intro screen before content</p>
                  </div>
                  <Switch checked={editEnableIntro} onCheckedChange={setEditEnableIntro} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Enable Outro</Label>
                    <p className="text-xs text-muted-foreground">Show branded outro screen after content</p>
                  </div>
                  <Switch checked={editEnableOutro} onCheckedChange={setEditEnableOutro} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateProject.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateProject.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:border-primary/50" onClick={() => setTab("content")}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Posts</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{project.postCount ?? 0}</div></CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary/50" onClick={() => setTab("schedules")}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Schedules</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{project.schedules.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Niches</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{project.nicheCount}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <ProjectContentTab projectId={id!} />
        </TabsContent>

        <TabsContent value="renders">
          <ProjectRendersTab projectId={id!} />
        </TabsContent>

        <TabsContent value="calendar">
          <ProjectCalendarTab projectId={id!} />
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardContent className="pt-6">
              <ScheduleEditor projectId={id!} schedules={project.schedules} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader><CardTitle className="text-base">Social Handles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div key={platform} className="flex items-center gap-3">
                  <Label className="w-24 capitalize">{platform}</Label>
                  <Input value={editHandles[platform] ?? ""} onChange={(e) => setHandle(platform, e.target.value)} placeholder={`@${platform}_handle`} />
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateProject.isPending}>
                  <Save className="mr-2 h-4 w-4" />Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader><CardTitle className="text-base">Color Palette</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {["primary", "secondary", "accent", "background"].map((key) => (
                <div key={key} className="flex items-center gap-3">
                  <Label className="w-24 capitalize">{key}</Label>
                  <div className="flex items-center gap-2 flex-1">
                    <input type="color" value={editPalette[key] ?? "#000000"} onChange={(e) => setPaletteColor(key, e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                    <Input value={editPalette[key] ?? ""} onChange={(e) => setPaletteColor(key, e.target.value)} placeholder="#000000" className="flex-1" />
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateProject.isPending}>
                  <Save className="mr-2 h-4 w-4" />Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <ProjectAccountsTab projectId={id!} linkedAccounts={project.linkedSocialAccounts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
