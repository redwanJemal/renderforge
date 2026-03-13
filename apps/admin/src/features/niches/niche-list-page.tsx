import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNiches } from "@/hooks/use-niches";

export function NicheListPage() {
  const { data, isLoading, isError } = useNiches();
  const niches = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Layers className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Niches</h1>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load niches. Please try again.
        </div>
      ) : niches.length === 0 ? (
        <div className="rounded-md border p-12 text-center text-muted-foreground">
          No niches configured yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {niches.map((niche) => (
            <Card key={niche.id}>
              <CardHeader>
                <CardTitle className="text-lg">{niche.name}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {niche.slug}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Template</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    {niche.defaultTemplateId}
                  </code>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Voice</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    {niche.voiceId}
                  </code>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Languages</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {niche.languages.map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
