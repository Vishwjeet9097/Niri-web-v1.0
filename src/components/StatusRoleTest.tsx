/**
 * Test component to demonstrate role-based status display
 * Shows how different users see different status information
 */

import { getStatusPills, getWaitingMessage } from "@/utils/statusUtils";

interface StatusRoleTestProps {
  status: string;
}

export function StatusRoleTest({ status }: StatusRoleTestProps) {
  const roles = [
    "NODAL_OFFICER",
    "STATE_APPROVER", 
    "MOSPI_REVIEWER",
    "MOSPI_APPROVER"
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Status Display by Role</h2>
      <p className="text-gray-600">Status: <strong>{status}</strong></p>
      
      {roles.map((role) => {
        const statusPills = getStatusPills(status, role);
        const waitingMessage = getWaitingMessage(status, role);
        
        return (
          <div key={role} className="p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-lg mb-2">{role}</h3>
            
            <div className="space-y-2">
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
              
              {waitingMessage ? (
                <div>
                  <strong>Waiting Message:</strong> {waitingMessage}
                </div>
              ) : (
                <div>
                  <strong>Waiting Message:</strong> <em>(No message displayed)</em>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Example usage
export function StatusRoleExamples() {
  const testStatuses = [
    "SUBMITTED_TO_STATE",
    "SUBMITTED_TO_MOSPI_REVIEWER", 
    "SUBMITTED_TO_MOSPI_APPROVER",
    "APPROVED",
    "RETURNED_FROM_STATE"
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Role-Based Status Display Test</h1>
      {testStatuses.map((status) => (
        <StatusRoleTest key={status} status={status} />
      ))}
    </div>
  );
}
