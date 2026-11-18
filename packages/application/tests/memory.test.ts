import { InMemoryLogStore, InMemorySettingsStore } from '@boardclimb/application';
import { runLogStoreContract, runSettingsStoreContract } from '@boardclimb/application/testing';

runLogStoreContract('InMemoryLogStore', () => new InMemoryLogStore());
runSettingsStoreContract('InMemorySettingsStore', () => new InMemorySettingsStore());
