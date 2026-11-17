import type { CommandStatus } from '@boardclimb/application';
import type { ProblemKey } from '@boardclimb/domain';
import type { CommandLine } from './CommandLine';
import { describeBoardError } from './describeBoardError';

/**
 * What this phone knows about lighting `current`. `sent` is the last command that left this phone; only
 * `confirmed` means the board reported it. A command for another problem is shown as such, so the
 * climber is never told the board shows a problem it may not.
 */
export function describeCommand(status: CommandStatus, current: ProblemKey): CommandLine | null {
  if (status.state === 'idle') return null;
  const forThisProblem = status.problemKey === current;
  if (status.state === 'sent' || status.state === 'confirmed') {
    if (!forThisProblem) {
      return {
        tone: 'sent',
        title: 'Another problem was last sent from this phone',
        message: 'Tap Light up to show this one.',
      };
    }
    return status.state === 'confirmed'
      ? { tone: 'confirmed', title: 'The board confirmed the lights' }
      : {
          tone: 'sent',
          title: 'Last command sent from this phone',
          message: 'The board has not confirmed it.',
        };
  }
  if (!forThisProblem) return null;
  if (status.state === 'pending') return { tone: 'progress', title: 'Sending to the board…' };
  const guidance = describeBoardError(status.code);
  return { tone: 'error', title: guidance.title, message: guidance.action };
}
