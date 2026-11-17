import { Notice } from '@boardclimb/design-system';
import { describeMode } from './presentation/describeMode';
import { describePersistence } from './presentation/describePersistence';

interface ModeBannerProps {
  mode: 'sample' | 'unverified' | 'live';
  persistent: boolean;
}

/** One notice for sample data and unsaved records; nothing is shown once real sources and storage are in use. */
export function ModeBanner({ mode, persistent }: ModeBannerProps) {
  const sample = describeMode(mode);
  const unsaved = describePersistence(persistent);
  const first = sample ?? unsaved;
  if (!first) return null;
  const message = sample && unsaved ? `${sample.action} ${unsaved.action}` : first.action;
  return <Notice title={first.title} message={message} />;
}
