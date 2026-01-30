import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MinistryOverviewTab } from './tabs/MinistryOverviewTab';
import { MinistryDataReviewTab } from './tabs/MinistryDataReviewTab';
import { MinistryDocumentsTab } from './tabs/MinistryDocumentsTab';
import { MinistryHistoryTab } from './tabs/MinistryHistoryTab';

interface MinistryReviewPreviewTabsProps {
  submission: any;
  currentUserRole?: string;
  currentUserPhone?: string;
  useConsolidatedApi?: boolean;
  submissionId?: string;
  consolidatedFormStatus?: string | null;
  defaultTab?: 'overview' | 'data-review' | 'documents' | 'history';
  showTabs?: ('overview' | 'data-review' | 'documents' | 'history')[];
}

/**
 * Reusable component for Ministry Review and Preview tabs
 * Can be used in both review pages and user management pages
 */
export function MinistryReviewPreviewTabs({
  submission,
  currentUserRole,
  currentUserPhone,
  useConsolidatedApi = false,
  submissionId,
  consolidatedFormStatus,
  defaultTab = 'overview',
  showTabs = ['overview', 'data-review', 'documents', 'history'],
}: MinistryReviewPreviewTabsProps) {
  if (!submission) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No submission data available</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full mb-6">
        {showTabs.includes('overview') && (
          <TabsTrigger value="overview">Overview</TabsTrigger>
        )}
        {showTabs.includes('data-review') && (
          <TabsTrigger value="data-review">Data Review</TabsTrigger>
        )}
        {showTabs.includes('documents') && (
          <TabsTrigger value="documents">Documents</TabsTrigger>
        )}
        {showTabs.includes('history') && (
          <TabsTrigger value="history">History</TabsTrigger>
        )}
      </TabsList>

      {showTabs.includes('overview') && (
        <TabsContent value="overview">
          <MinistryOverviewTab 
            submission={submission} 
            currentUserRole={currentUserRole}
            currentUserPhone={currentUserPhone}
          />
        </TabsContent>
      )}

      {showTabs.includes('data-review') && (
        <TabsContent value="data-review">
          <MinistryDataReviewTab 
            submission={submission}
            useConsolidatedApi={useConsolidatedApi}
            submissionId={submissionId}
            consolidatedFormStatus={consolidatedFormStatus}
          />
        </TabsContent>
      )}

      {showTabs.includes('documents') && (
        <TabsContent value="documents">
          <MinistryDocumentsTab 
            submission={submission}
            documents={submission?.attachedFiles || []}
            formData={submission?.formData}
            submissionId={submission?.id}
          />
        </TabsContent>
      )}

      {showTabs.includes('history') && (
        <TabsContent value="history">
          <MinistryHistoryTab submission={submission} />
        </TabsContent>
      )}
    </Tabs>
  );
}

