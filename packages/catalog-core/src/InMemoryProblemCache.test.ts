import { InMemoryProblemCache } from './InMemoryProblemCache';
import { runProblemCacheContract } from './testing';

runProblemCacheContract('InMemoryProblemCache', () => new InMemoryProblemCache());
