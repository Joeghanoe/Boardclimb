/** One line about the last lighting command, worded so a sent command is never presented as confirmed (FR-009). */
export interface CommandLine {
  tone: 'progress' | 'sent' | 'confirmed' | 'error';
  title: string;
  message?: string;
}
