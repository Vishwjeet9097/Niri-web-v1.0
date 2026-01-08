import { Card, CardContent } from '@/components/ui/card';
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
  const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | undefined }) => (
    <div className="flex items-start gap-3 mb-4 last:mb-0">
      <div className="mt-0.5">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value || 'N/A'}</p>
      </div>
    </div>
  );

  return (
    <Card className="bg-white rounded-lg overflow-hidden">
      <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
        <h3 className="text-sm font-semibold text-gray-900">Ministry Approver Information</h3>
      </div>
      <CardContent className="p-6">
        <InfoItem icon={User} label="Name" value={name} />
        <InfoItem 
          icon={Building2} 
          label="Role" 
          value={currentUserRole ? getRoleDisplayName(currentUserRole).replace(/_/g, ' ') : role} 
        />
        <InfoItem icon={Mail} label="Email" value={email} />
        <InfoItem icon={Phone} label="Phone" value={currentUserPhone || phone} />
      </CardContent>
    </Card>
  );
}

