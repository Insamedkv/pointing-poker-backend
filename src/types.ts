import { Issue } from './models/room';

export interface ChatMessage {
  roomId: string;
  userId?: string;
  content: string;
}

export interface Bet {
  roomId: string;
  userId: string;
  issueId: string;
  content: string;
}

export interface SocketIssueCreate {
  roomId: string;
  issue: Issue;
}

export interface SocketIssueUpdate {
  issueId: string;
  roomId: string;
  issue: Issue;
}
