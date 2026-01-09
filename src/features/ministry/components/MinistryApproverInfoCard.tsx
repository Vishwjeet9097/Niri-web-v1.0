import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Building2, Mail, Phone } from 'lucide-react';
import { getRoleDisplayName } from '@/utils/roles';

export interface MinistryApproverInfoCardProps {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  currentUserRole?: string;
  currentUserPhone?: string;
}

export function MinistryApproverInfoCard({
  name,
  role,
  email,
  phone,
  currentUserRole,
  currentUserPhone,
}: MinistryApproverInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="tracking-tight text-base font-semibold bg-[#E9EDFB] px-6 py-2">Ministry Approver Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-[#212121]">Name</p>
            <p className="text-[#727272] text-sm">{name || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-[#212121]">Role</p>
            <p className="text-[#727272] text-sm">
              {currentUserRole ? getRoleDisplayName(currentUserRole).replace(/_/g, ' ') : (role ? getRoleDisplayName(role).replace(/_/g, ' ') : 'N/A')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-[#212121]">Email</p>
            <p className="font-medium text-sm">{email || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-[#212121]">Phone</p>
            <p className="text-[#727272] text-sm">{currentUserPhone || phone || 'N/A'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

