import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSocialAccounts } from "@/hooks/use-social";
import { usePublishRender } from "@/hooks/use-renders";

type PublishDialogProps = {
  renderIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PublishDialog({ renderIds, open, onOpenChange }: PublishDialogProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const { data: accounts, isLoading } = useSocialAccounts();
  const publishRender = usePublishRender();
  const [publishing, setPublishing] = useState(false);

  function toggleAccount(id: string) {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePublish() {
    if (selectedAccounts.size === 0) {
      toast.error("Select at least one account");
      return;
    }

    setPublishing(true);
    const accountIds = Array.from(selectedAccounts);
    let successCount = 0;

    for (const renderId of renderIds) {
      try {
        await publishRender.mutateAsync({ renderId, socialAccountIds: accountIds });
        successCount++;
      } catch {
        toast.error(`Failed to publish render ${renderId.slice(0, 8)}`);
      }
    }

    if (successCount > 0) {
      toast.success(`Published ${successCount} render(s) to ${accountIds.length} account(s)`);
    }

    setPublishing(false);
    setSelectedAccounts(new Set());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish {renderIds.length} Render(s)</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !accounts || accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No social accounts connected. Go to Settings to connect an account.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select accounts to publish to:
            </p>
            {accounts.map((account) => (
              <label
                key={account.id}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50"
              >
                <Checkbox
                  checked={selectedAccounts.has(account.id)}
                  onCheckedChange={() => toggleAccount(account.id)}
                />
                <div>
                  <p className="text-sm font-medium capitalize">{account.provider}</p>
                  <p className="text-xs text-muted-foreground">{account.accountName}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishing || selectedAccounts.size === 0}
          >
            {publishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
