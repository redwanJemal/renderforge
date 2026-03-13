import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      </div>

      <Card className="max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription className="text-base">
            Analytics will be available after social media integration is
            connected. You will be able to track views, engagement, and render
            performance across all your published content.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Connect your social accounts in Settings to start collecting data.
        </CardContent>
      </Card>
    </div>
  );
}
