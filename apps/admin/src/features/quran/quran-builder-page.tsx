import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Book, Loader2, Plus, Clock, Music, Palette, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useQuranMeta,
  useQuranSurahs,
  useQuranPreview,
  useQuranCreate,
  type QuranPreview,
} from "@/hooks/use-quran";
import { useProjects } from "@/hooks/use-projects";
import { useNiches, type Niche } from "@/hooks/use-niches";

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

export function QuranBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") || "";

  // Data
  const { data: meta, isLoading: metaLoading } = useQuranMeta();
  const { data: surahs, isLoading: surahsLoading } = useQuranSurahs();
  const { data: projectsData } = useProjects();
  const { data: nichesData } = useNiches();
  const previewMutation = useQuranPreview();
  const createMutation = useQuranCreate();

  // Form state
  const [surahNumber, setSurahNumber] = useState<number>(0);
  const [ayahStart, setAyahStart] = useState("");
  const [ayahEnd, setAyahEnd] = useState("");
  const [reciterId, setReciterId] = useState(7);
  const [translationId, setTranslationId] = useState(20);
  const [themeIndex, setThemeIndex] = useState(0);
  const [projectId, setProjectId] = useState(preselectedProjectId);
  const [nicheId, setNicheId] = useState("");
  const [format, setFormat] = useState("story");

  // Preview data
  const [preview, setPreview] = useState<QuranPreview | null>(null);

  const projects = projectsData?.items ?? [];
  const niches: Niche[] = (nichesData as { items?: Niche[] })?.items ?? [];
  const selectedSurah = surahs?.find((s) => s.id === surahNumber);

  // Filter niches by selected project
  const projectNiches = useMemo(() => {
    if (!projectId) return niches;
    return niches.filter((n) => n.projectId === projectId);
  }, [niches, projectId]);

  // Auto-select niche when project changes
  const handleProjectChange = (id: string) => {
    setProjectId(id);
    const matching = niches.filter((n) => n.projectId === id);
    if (matching.length === 1) {
      setNicheId(matching[0].id);
    } else {
      setNicheId("");
    }
  };

  async function handlePreview() {
    if (!surahNumber) {
      toast.error("Select a surah");
      return;
    }
    try {
      const result = await previewMutation.mutateAsync({
        surahNumber,
        reciterId,
        translationId,
        themeIndex,
        ayahStart: ayahStart ? parseInt(ayahStart) : undefined,
        ayahEnd: ayahEnd ? parseInt(ayahEnd) : undefined,
      });
      setPreview(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    }
  }

  async function handleCreate() {
    if (!preview || !projectId || !nicheId) {
      toast.error("Complete all fields and preview first");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        surahNumber,
        reciterId,
        translationId,
        themeIndex,
        ayahStart: ayahStart ? parseInt(ayahStart) : undefined,
        ayahEnd: ayahEnd ? parseInt(ayahEnd) : undefined,
        projectId,
        nicheId,
        format,
      });
      toast.success(`Created ${result.created} post${result.created > 1 ? "s" : ""}`);
      // Navigate to project content tab
      navigate(`/projects/${projectId}?tab=content`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    }
  }

  if (metaLoading || surahsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const themes = meta?.themes ?? [];
  const reciters = meta?.reciters ?? [];
  const translations = meta?.translations ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Book className="h-6 w-6" />
          Quran Content Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create Quran recitation videos by selecting surah, reciter, ayah range, and theme
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Panel: Configuration ── */}
        <div className="space-y-4">
          {/* Surah Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Surah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={surahNumber ? String(surahNumber) : ""}
                onValueChange={(v) => {
                  setSurahNumber(parseInt(v));
                  setAyahStart("");
                  setAyahEnd("");
                  setPreview(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a surah..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {surahs?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.id}. {s.name_simple} ({s.name_arabic}) — {s.verses_count} ayahs
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSurah && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">From Ayah</Label>
                    <Input
                      type="number"
                      min={1}
                      max={selectedSurah.verses_count}
                      placeholder="1"
                      value={ayahStart}
                      onChange={(e) => { setAyahStart(e.target.value); setPreview(null); }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To Ayah</Label>
                    <Input
                      type="number"
                      min={1}
                      max={selectedSurah.verses_count}
                      placeholder={String(selectedSurah.verses_count)}
                      value={ayahEnd}
                      onChange={(e) => { setAyahEnd(e.target.value); setPreview(null); }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reciter & Translation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="h-4 w-4" />
                Audio & Translation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Reciter</Label>
                <Select value={String(reciterId)} onValueChange={(v) => { setReciterId(parseInt(v)); setPreview(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {reciters.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Translation</Label>
                <Select value={String(translationId)} onValueChange={(v) => { setTranslationId(parseInt(v)); setPreview(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {translations.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.language})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Color Theme */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color Theme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {themes.map((theme, i) => (
                  <button
                    key={i}
                    onClick={() => { setThemeIndex(i); setPreview(null); }}
                    className={`relative rounded-lg p-3 border-2 transition-all ${
                      themeIndex === i ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                    }`}
                    style={{ background: `linear-gradient(135deg, ${theme.bg[0]}, ${theme.bg[1]})` }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ background: theme.accent }} />
                      <div className="w-2 h-2 rounded-full" style={{ background: theme.highlight }} />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: theme.accent }}>
                      {theme.name}
                    </span>
                    {themeIndex === i && (
                      <CheckCircle2 className="absolute top-1 right-1 h-3 w-3 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Target Project */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Target</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Project</Label>
                <Select value={projectId} onValueChange={handleProjectChange}>
                  <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Niche</Label>
                <Select value={nicheId} onValueChange={setNicheId}>
                  <SelectTrigger><SelectValue placeholder="Select niche..." /></SelectTrigger>
                  <SelectContent>
                    {projectNiches.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="story">Story (1080x1920)</SelectItem>
                    <SelectItem value="post">Post (1080x1080)</SelectItem>
                    <SelectItem value="landscape">Landscape (1920x1080)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handlePreview}
              disabled={!surahNumber || previewMutation.isPending}
              variant="outline"
              className="flex-1"
            >
              {previewMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
              ) : (
                "Preview"
              )}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!preview || !projectId || !nicheId || createMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" />Create {preview ? `${preview.parts.length} Post${preview.parts.length > 1 ? "s" : ""}` : "Posts"}</>
              )}
            </Button>
          </div>
        </div>

        {/* ── Right Panel: Preview ── */}
        <div>
          {!preview && !previewMutation.isPending && (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center text-muted-foreground">
                <Book className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a surah and click Preview</p>
                <p className="text-xs mt-1">to see what will be created</p>
              </CardContent>
            </Card>
          )}

          {previewMutation.isPending && (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Fetching from quran.com...</p>
              </CardContent>
            </Card>
          )}

          {preview && (
            <div className="space-y-4">
              {/* Surah Header */}
              <Card
                style={{
                  background: `linear-gradient(135deg, ${preview.theme.bg[0]}, ${preview.theme.bg[1]}, ${preview.theme.bg[2]})`,
                  borderColor: `${preview.theme.accent}30`,
                }}
              >
                <CardContent className="pt-6 text-center">
                  <p
                    className="text-4xl font-semibold mb-2"
                    style={{ fontFamily: '"Noto Sans Arabic", serif', color: preview.theme.highlight }}
                  >
                    {preview.surahNameArabic}
                  </p>
                  <p className="text-lg font-medium" style={{ color: preview.theme.accent }}>
                    {preview.surahName}
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-3 text-sm" style={{ color: `${preview.theme.accent}AA` }}>
                    <span>{preview.totalAyahs} ayahs</span>
                    <span>|</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(preview.totalDurationMs)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs" style={{ color: `${preview.theme.accent}80` }}>
                    {preview.reciterName}
                  </p>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {preview.parts.length === 1
                      ? "1 Post will be created"
                      : `${preview.parts.length} Posts will be created`}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {preview.parts.length > 1
                      ? "Surah split into parts (max 5 min each)"
                      : "Fits in a single video"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {preview.parts.map((part, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div>
                        <p className="text-sm font-medium">{part.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Ayahs {part.ayahRange} ({part.ayahCount} verses)
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {formatDuration(part.durationMs)}
                        </Badge>
                        {part.audioStartMs > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            audio @{Math.round(part.audioStartMs / 1000)}s
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
