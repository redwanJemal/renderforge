import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProjectCalendar } from "@/hooks/use-projects";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function statusBadgeColor(status: string): string {
  switch (status) {
    case "draft": return "bg-gray-400";
    case "ready": return "bg-blue-500";
    case "rendered": return "bg-green-500";
    case "published": return "bg-emerald-600";
    default: return "bg-gray-400";
  }
}

interface ProjectCalendarTabProps {
  projectId: string;
}

export function ProjectCalendarTab({ projectId }: ProjectCalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: calendarData, isLoading } = useProjectCalendar(projectId, month + 1, year);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const fillRate = calendarData?.fillRate;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[160px] text-center">{MONTHS[month]} {year}</h3>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </div>
        {fillRate && fillRate.totalExpected > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{fillRate.totalActual}/{fillRate.totalExpected} slots</span>
            <span className="ml-1">({Math.round((fillRate.totalActual / fillRate.totalExpected) * 100)}%)</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full rounded-lg" />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {DAYS.map((day) => (
              <div key={day} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
            ))}
            {cells.map((day, i) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayPosts = day ? (calendarData?.postsByDay[day] ?? []) : [];
              const expected = day ? (calendarData?.expectedByDay[day] ?? []) : [];
              const totalExpected = expected.reduce((sum, e) => sum + e.count, 0);
              const hasGap = totalExpected > 0 && dayPosts.length < totalExpected;

              return (
                <div key={i} className={cn("bg-card min-h-[90px] p-1.5 text-sm", !day && "bg-muted/30", hasGap && "bg-red-50 dark:bg-red-950/20")}>
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday && "bg-primary text-primary-foreground font-bold")}>{day}</span>
                        {totalExpected > 0 && <span className="text-[10px] text-muted-foreground">{dayPosts.length}/{totalExpected}</span>}
                      </div>
                      {expected.map((slot, j) => (
                        <div key={j} className="text-[10px] text-muted-foreground truncate">{slot.count}x {slot.format} {slot.templateId}</div>
                      ))}
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {dayPosts.slice(0, 4).map((post) => (
                          <Badge key={post.id} className={cn("h-1.5 w-1.5 rounded-full p-0", statusBadgeColor(post.status))} title={`${post.title} (${post.status})`} />
                        ))}
                        {dayPosts.length > 4 && <span className="text-[9px] text-muted-foreground">+{dayPosts.length - 4}</span>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Badge className="h-2 w-2 rounded-full p-0 bg-gray-400" /><span>Draft</span></div>
            <div className="flex items-center gap-1.5"><Badge className="h-2 w-2 rounded-full p-0 bg-blue-500" /><span>Ready</span></div>
            <div className="flex items-center gap-1.5"><Badge className="h-2 w-2 rounded-full p-0 bg-green-500" /><span>Rendered</span></div>
            <div className="flex items-center gap-1.5"><Badge className="h-2 w-2 rounded-full p-0 bg-emerald-600" /><span>Published</span></div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded bg-red-100 dark:bg-red-950 border border-red-300" /><span>Gap</span></div>
          </div>
        </>
      )}
    </div>
  );
}
