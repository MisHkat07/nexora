import { useSelector } from 'react-redux';

import { selectCurrentAdmin } from '@/redux/auth/selectors';

/**
 * Whether the logged-in user may do something, e.g. can('invoice', 'create').
 * Permissions come from the server at login (see backend src/auth/permissions.js). The
 * server enforces them on every request; this only hides actions the user can't take.
 */
export default function usePermission() {
  const current = useSelector(selectCurrentAdmin);
  const permissions = current?.permissions;

  const can = (entity, action) => {
    // Sessions from before roles existed carry no list; the server still checks every request
    if (!Array.isArray(permissions)) return true;
    const permission = `${String(entity).toLowerCase()}:${action}`;
    return permissions.includes('*') || permissions.includes(permission);
  };

  return { can, role: current?.role };
}
