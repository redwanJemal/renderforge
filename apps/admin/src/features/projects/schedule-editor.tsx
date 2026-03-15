import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import {
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useRunSchedule,
  type ProjectSchedule,
} from "@/hooks/use-projects";
import { toast } from "sonner";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const FORMATS = [
  { value: "story", label: "Story (9:16)" },
  { value: "post", label: "Post (1:1)" },
  { value: "landscape", label: "Landscape (16:9)" },
];

interface ScheduleEditorProps {
  projectId: string;
  schedules: ProjectSchedule[];
}

export function ScheduleEditor({ projectId, schedules }: ScheduleEditorProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newTemplateId, setNewTemplateId] = useState("");
  const [newFormat, setNewFormat] = useState("story");
  const [newTheme, setNewTheme] = useState("");
  const [newPostsPerDay, setNewPostsPerDay] = useState(1);
  const [newDaysOfWeek, setNewDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newAutoRender, setNewAutoRender] = useState(false);

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const runSchedule = useRunSchedule();

  function toggleDay(day: number) {
    setNewDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function handleAdd() {
    if (!newTemplateId.trim()) return;
    try {
      await createSchedule.mutateAsync({
        projectId,
        templateId: newTemplateId.trim(),
        format: newFormat,
        theme: newTheme.trim() || undefined,
        postsPerDay: newPostsPerDay,
        daysOfWeek: newDaysOfWeek,
        autoRender: newAutoRender,
      });
      toast.success("Schedule added");
      setAddOpen(false);
      setNewTemplateId("");
      setNewTheme("");
      setNewPostsPerDay(1);
      setNewDaysOfWeek([1, 2, 3, 4, 5]);
      setNewAutoRender(false);
    } catch {
      toast.error("Failed to add schedule");
    }
  }

  async function handleToggleEnabled(schedule: ProjectSchedule) {
    try {
      await updateSchedule.mutateAsync({
        projectId,
        id: schedule.id,
        enabled: !schedule.enabled,
      });
    } catch {
      toast.error("Failed to update schedule");
    }
  }

  async function handleToggleAutoRender(schedule: ProjectSchedule) {
    try {
      await updateSchedule.mutateAsync({
        projectId,
        id: schedule.id,
        autoRender: !schedule.autoRender,
      });
    } catch {
      toast.error("Failed to update schedule");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSchedule.mutateAsync({ projectId, id });
      toast.success("Schedule removed");
    } catch {
      toast.error("Failed to delete schedule");
    }
  }

  async function handleRunSchedule() {
    try {
      const result = await runSchedule.mutateAsync(projectId);
      toast.success(`Created ${result.rendersCreated} render(s)`);
    } catch {
      toast.error("Failed to run schedule");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Content Schedules</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRunSchedule} disabled={runSchedule.isPending}>
            {runSchedule.isPending ? "Running..." : "Run Schedule Now"}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Add Schedule
          </Button>
        </div>
      </div>

      {schedules.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No schedules configured.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Posts/Day</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Auto-Render</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-mono text-xs">{schedule.templateId}</TableCell>
                  <TableCell>{schedule.format}</TableCell>
                  <TableCell>{schedule.postsPerDay}</TableCell>
                  <TableCell className="text-xs">
                    {schedule.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ")}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={schedule.autoRender}
                      onCheckedChange={() => handleToggleAutoRender(schedule)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={() => handleToggleEnabled(schedule)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Schedule Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template ID</Label>
              <Input value={newTemplateId} onChange={(e) => setNewTemplateId(e.target.value)} placeholder="e.g. yld-intro" />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={newFormat} onValueChange={setNewFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Theme (optional)</Label>
              <Input value={newTheme} onChange={(e) => setNewTheme(e.target.value)} placeholder="default" />
            </div>
            <div className="space-y-2">
              <Label>Posts per Day</Label>
              <Input type="number" min={1} max={50} value={newPostsPerDay} onChange={(e) => setNewPostsPerDay(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex gap-3">
                {DAY_LABELS.map((label, i) => (
                  <label key={i} className="flex items-center gap-1 text-sm">
                    <Checkbox checked={newDaysOfWeek.includes(i)} onCheckedChange={() => toggleDay(i)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newAutoRender} onCheckedChange={setNewAutoRender} />
              <Label>Auto-render</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createSchedule.isPending || !newTemplateId.trim()}>
              {createSchedule.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
