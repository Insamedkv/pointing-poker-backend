import { Issue } from './models/room';

export interface ChatMessage {
  roomId: string;
  userId?: string;
  content: string;
}

export interface Bet {
  roomId: string;
  userId?: string;
  content: string;
}

export interface SocketIssue {
  roomId: string;
  issueId: string;
  issue: Issue;
}
