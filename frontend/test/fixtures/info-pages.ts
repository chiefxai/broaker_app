export interface SupportTicketFixture {
  category: string;
  description: string;
  attachmentName?: string;
}

export const validSupportTicket: SupportTicketFixture = {
  category: 'Patta / FMB Cadastral Sync',
  description: 'The survey map does not finish syncing to my property listing.',
  attachmentName: 'survey-map.pdf',
};

export const supportGuideSearchFixture = {
  query: 'survey map',
  expectedQuestion: 'What file formats are accepted for cadastral survey maps?',
} as const;
