import { useState, useRef, type FormEvent } from "react";
import {
  HardDrive,
  Loader2,
  Music,
  Play,
  Pause,
  Settings,
  Trash2,
  Upload,
  User,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Types
type StorageInfo = {
  endpoint: string;
  bucket: string;
  connected: boolean;
  usedBytes: number;
  totalBytes: number;
};

type BGMTrack = {
  id: string;
  name: string;
  category: string;
  durationSeconds: number;
  url: string;
};

// Hooks
function useStorageInfo() {
  return useQuery({
    queryKey: ["settings", "storage"],
    queryFn: () => api.get<StorageInfo>("/api/settings/storage"),
  });
}

function useBGMTracks() {
  return useQuery({
    queryKey: ["settings", "bgm"],
    queryFn: () => api.get<BGMTrack[]>("/api/settings/bgm"),
  });
}

function useDeleteBGMTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/settings/bgm/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "bgm"] }),
  });
}

// Main Component
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="bgm" className="gap-2">
            <Music className="h-4 w-4" />
            BGM Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="storage" className="mt-6">
          <StorageTab />
        </TabsContent>
        <TabsContent value="bgm" className="mt-6">
          <BGMTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Profile Tab
function ProfileTab() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/api/settings/profile", { name, email });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setSaving(true);
    try {
      await api.post("/api/settings/password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      toast.error("Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              disabled={saving || !currentPassword || !newPassword}
            >
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Storage Tab
function StorageTab() {
  const { data, isLoading } = useStorageInfo();

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  if (isLoading) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Object Storage</CardTitle>
        <CardDescription>S3/MinIO storage configuration and status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection Status</span>
          {data?.connected ? (
            <Badge
              variant="default"
              className="bg-green-600 hover:bg-green-600 gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              Disconnected
            </Badge>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Endpoint</span>
            <code className="text-sm bg-muted px-2 py-0.5 rounded">
              {data?.endpoint ?? "--"}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bucket</span>
            <code className="text-sm bg-muted px-2 py-0.5 rounded">
              {data?.bucket ?? "--"}
            </code>
          </div>
          {data && data.totalBytes > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Usage</span>
              <span className="text-sm">
                {formatBytes(data.usedBytes)} / {formatBytes(data.totalBytes)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// BGM Tab
function BGMTab() {
  const { data: tracks, isLoading } = useBGMTracks();
  const deleteTrack = useDeleteBGMTrack();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Upload state
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  function togglePlay(track: BGMTrack) {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(track.id);
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadName) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName);
      formData.append("category", uploadCategory || "general");

      const token = localStorage.getItem("rf_token");
      await fetch("/api/settings/bgm", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      toast.success("Track uploaded");
      setUploadName("");
      setUploadCategory("");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["settings", "bgm"] });
    } catch {
      toast.error("Failed to upload track");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTrack.mutateAsync(id);
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      toast.success("Track deleted");
    } catch {
      toast.error("Failed to delete track");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload Track</CardTitle>
          <CardDescription>
            Add a new background music track to the library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex items-end gap-3 flex-wrap">
            <div className="space-y-2 flex-1 min-w-[160px]">
              <Label htmlFor="bgm-name">Name</Label>
              <Input
                id="bgm-name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Track name"
                required
              />
            </div>
            <div className="space-y-2 flex-1 min-w-[140px]">
              <Label htmlFor="bgm-category">Category</Label>
              <Input
                id="bgm-category"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                placeholder="e.g. ambient"
              />
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="bgm-file">Audio File</Label>
              <Input
                id="bgm-file"
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <Button type="submit" disabled={uploading || !uploadFile || !uploadName}>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>BGM Library</CardTitle>
          <CardDescription>
            Available background music tracks for video rendering.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !tracks || tracks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No tracks in the library. Upload one above.
                  </TableCell>
                </TableRow>
              ) : (
                tracks.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => togglePlay(track)}
                      >
                        {playingId === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{track.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{track.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(track.durationSeconds)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(track.id)}
                        disabled={deleteTrack.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
