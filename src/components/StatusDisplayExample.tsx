/**
 * Example component showing how status text is displayed based on status
 * This demonstrates the centralized status management system
 */

import { getStatusInfo, getStatusPills, getWaitingMessage } from "@/utils/statusUtils";

interface StatusDisplayExampleProps {
  status: string;
  currentUserRole?: string;
}

export function StatusDisplayExample({ status, currentUserRole }: StatusDisplayExampleProps) {
  const statusInfo = getStatusInfo(status);
  const statusPills = getStatusPills(status, currentUserRole);
  const waitingMessage = currentUserRole ? getWaitingMessage(status, currentUserRole) : "";

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold mb-2">Status Display Example</h3>
      
      <div className="space-y-2">
        <div>
          <strong>Status:</strong> {status}
        </div>
        
        <div>
          <strong>Label:</strong> {statusInfo.label}
        </div>
        
        <div>
          <strong>Description:</strong> {statusInfo.description}
        </div>
        
        {waitingMessage && (
          <div>
            <strong>Waiting Message:</strong> {waitingMessage}
          </div>
        )}
        
        <div>
          <strong>Status Pills:</strong>
          <div className="flex gap-2 mt-1">
            {statusPills.map((pill, index) => (
              <span 
                key={index} 
                className={`px-2 py-1 text-xs rounded ${pill.className}`}
              >
                {pill.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Example usage for different statuses
export function StatusExamples() {
  const examples = [
    { status: "SUBMITTED_TO_STATE", role: "NODAL_OFFICER" },
    { status: "SUBMITTED_TO_STATE", role: "STATE_APPROVER" },
    { status: "SUBMITTED_TO_MOSPI_REVIEWER", role: "NODAL_OFFICER" },
    { status: "SUBMITTED_TO_MOSPI_APPROVER", role: "NODAL_OFFICER" },
    { status: "APPROVED", role: "NODAL_OFFICER" },
    { status: "RETURNED_FROM_STATE", role: "NODAL_OFFICER" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Status Display Examples</h2>
      {examples.map((example, index) => (
        <StatusDisplayExample 
          key={index}
          status={example.status}
          currentUserRole={example.role}
        />
      ))}
    </div>
  );
}
