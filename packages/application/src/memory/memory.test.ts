import { InMemoryLogStore } from './InMemoryLogStore';
import { InMemorySettingsStore } from './InMemorySettingsStore';
import { runLogStoreContract, runSettingsStoreContract } from '../testing';

runLogStoreContract('InMemoryLogStore', () => new InMemoryLogStore());
runSettingsStoreContract('InMemorySettingsStore', () => new InMemorySettingsStore());
