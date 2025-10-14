import { Button } from "@/components/ui/button";
import { Plus, Inbox } from "lucide-react";

interface EmptyStateProps {
  onAddClick: () => void;
}

export function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
        <Inbox className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">No Users Found!</h3>
      <p className="text-muted-foreground mb-8">
        No users have been added yet. Start by adding your first user.
      </p>
      <Button onClick={onAddClick} size="lg">
        <Plus className="w-4 h-4 mr-2" />
        Add New User
      </Button>
    </div>
  );
}
