'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/Spinner';

export default function ReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/reports');
  }, [router]);

  return <PageLoader />;
}
