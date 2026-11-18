import { InMemoryProblemCache } from '@boardclimb/catalog-core';
import { runProblemCacheContract } from '@boardclimb/catalog-core/testing';

runProblemCacheContract('InMemoryProblemCache', () => new InMemoryProblemCache());
