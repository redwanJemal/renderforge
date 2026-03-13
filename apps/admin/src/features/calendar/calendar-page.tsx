import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">
            {MONTHS[month]} {year}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {DAYS.map((day) => (
              <div
                key={day}
                className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
            {cells.map((day, i) => {
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();

              return (
                <div
                  key={i}
                  className={cn(
                    "bg-card min-h-[80px] p-1.5 text-sm",
                    !day && "bg-muted/30",
                  )}
                >
                  {day && (
                    <>
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                          isToday && "bg-primary text-primary-foreground font-bold",
                        )}
                      >
                        {day}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center text-muted-foreground text-sm">
            <p>
              Schedule posts by selecting a date. Connect social accounts to
              enable auto-publishing.
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <Badge variant="default" className="h-2 w-2 rounded-full p-0" />
                <span className="text-xs">Scheduled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="default"
                  className="h-2 w-2 rounded-full p-0 bg-green-600"
                />
                <span className="text-xs">Published</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="destructive"
                  className="h-2 w-2 rounded-full p-0"
                />
                <span className="text-xs">Failed</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
