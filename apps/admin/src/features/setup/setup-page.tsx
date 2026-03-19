import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clapperboard,
  Loader2,
  DollarSign,
  BookOpen,
  Languages,
  Baby,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

interface AvailableProject {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  BookOpen,
  Languages,
  Baby,
};

type Step = "account" | "projects" | "seeding";

export function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("account");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Project selection
  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  // Seeding status
  const [seedLogs, setSeedLogs] = useState<string[]>([]);
  const [seedDone, setSeedDone] = useState(false);

  // Check if setup is needed on mount
  useEffect(() => {
    fetch("/api/setup/status")
      .then((res) => res.json())
      .then((data) => {
        if (!data.needsSetup) {
          navigate("/login", { replace: true });
          return;
        }
        setAvailableProjects(data.availableProjects);
        // Pre-select all
        setSelectedProjects(
          new Set(data.availableProjects.map((p: AvailableProject) => p.id))
        );
      })
      .catch(() => {
        setError("Could not connect to API");
      });
  }, [navigate]);

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAccountSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setStep("projects");
  };

  const handleInit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/setup/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          projects: Array.from(selectedProjects),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Setup failed" }));
        throw new Error(data.error || "Setup failed");
      }

      const data = await res.json();

      // Store auth
      useAuthStore.getState().setAuth(data.token, data.user);

      if (data.seedingProjects.length > 0) {
        setStep("seeding");
        pollSeedStatus();
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const pollSeedStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/setup/seed-status", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("rf_token")}`,
          },
        });
        const data = await res.json();
        setSeedLogs(data.logs || []);

        if (!data.seeding) {
          clearInterval(interval);
          setSeedDone(true);
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className={step === "account" ? "text-primary font-medium" : "text-muted-foreground"}>
            1. Account
          </span>
          <ChevronRight className="h-4 w-4" />
          <span className={step === "projects" ? "text-primary font-medium" : ""}>
            2. Projects
          </span>
          <ChevronRight className="h-4 w-4" />
          <span className={step === "seeding" ? "text-primary font-medium" : ""}>
            3. Setup
          </span>
        </div>

        {/* Step 1: Account */}
        {step === "account" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Clapperboard className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Welcome to RenderForge</CardTitle>
              <CardDescription>
                Create your admin account to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Admin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@renderforge.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Project selection */}
        {step === "projects" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Select Projects</CardTitle>
              <CardDescription>
                Choose which content projects to seed. You can always add more later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {availableProjects.map((project) => {
                  const Icon = ICON_MAP[project.icon] || Clapperboard;
                  const isSelected = selectedProjects.has(project.id);

                  return (
                    <label
                      key={project.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleProject(project.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{project.name}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("account")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleInit}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : selectedProjects.size > 0 ? (
                    `Start with ${selectedProjects.size} project${selectedProjects.size > 1 ? "s" : ""}`
                  ) : (
                    "Skip — start empty"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Seeding progress */}
        {step === "seeding" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {seedDone ? "Setup Complete!" : "Setting up projects..."}
              </CardTitle>
              <CardDescription>
                {seedDone
                  ? "Your content projects are ready."
                  : "This may take a few minutes for Quran data."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!seedDone && (
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {seedLogs.length > 0 && (
                <div className="max-h-60 overflow-y-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
                  {seedLogs.map((log, i) => (
                    <div key={i} className="text-muted-foreground">
                      {log}
                    </div>
                  ))}
                </div>
              )}

              {seedDone && (
                <Button
                  onClick={() => navigate("/", { replace: true })}
                  className="w-full"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
