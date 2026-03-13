import { FileText, Film, CheckCircle, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/hooks/use-dashboard";

function KpiCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your content pipeline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Posts"
          value={data?.totalPosts}
          icon={FileText}
          loading={isLoading}
        />
        <KpiCard
          title="Total Renders"
          value={data?.totalRenders}
          icon={Film}
          loading={isLoading}
        />
        <KpiCard
          title="Published This Week"
          value={data?.publishedThisWeek}
          icon={CheckCircle}
          loading={isLoading}
        />
        <KpiCard
          title="Pending Audio"
          value={data?.pendingAudio}
          icon={Mic}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Renders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.rendersByStatus?.length ? (
                    data.rendersByStatus.map((row) => (
                      <TableRow key={row.status}>
                        <TableCell>
                          <Badge variant="outline">{row.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {row.count}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No render data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Posts by Niche</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Niche</TableHead>
                    <TableHead className="text-right">Posts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.postsByNiche?.length ? (
                    data.postsByNiche.map((row) => (
                      <TableRow key={row.nicheId}>
                        <TableCell>{row.nicheName}</TableCell>
                        <TableCell className="text-right font-medium">
                          {row.count}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No niche data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
