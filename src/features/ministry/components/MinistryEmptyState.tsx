import { FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface MinistryEmptyStateProps {
  onCreateSubmission?: () => void;
  error?: string;
}

export function MinistryEmptyState({ onCreateSubmission, error }: MinistryEmptyStateProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Submission</AlertTitle>
              <AlertDescription className="mt-2">
                {error}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">No Submission Found</h2>
              <p className="text-muted-foreground max-w-md">
                You don't have an active ministry submission. Please create a new submission to get started with your ministry data submission.
              </p>
            </div>

            {onCreateSubmission && (
              <Button onClick={onCreateSubmission} className="mt-4">
                Create New Submission
              </Button>
            )}

            <Alert className="mt-6 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                If you believe you should have a submission, please contact your administrator or try refreshing the page.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

