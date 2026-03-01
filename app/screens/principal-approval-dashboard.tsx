import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Legacy approvals dashboard route shim.
 *
 * This screen has been replaced by the POP review flow.
 * Keep this redirect so older links/routes continue to work.
 */
export default function PrincipalApprovalDashboardLegacyRedirect() {
  return <Redirect href="/screens/pop-review" />;
}
