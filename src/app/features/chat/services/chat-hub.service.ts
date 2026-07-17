import { Injectable,inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { MessageDto } from '../models/message.model';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface MessagesReadEvent{
  chatId: number;
  userId:string;
}

export interface MessageDeletedEvent {
  chatId: number;
  messageId: number;
}
@Injectable({
  providedIn: 'root',
})
export class ChatHubService {

  private authService = inject(AuthService);

  private hubUrl = environment.chatHubUrl;
  private connection: signalR.HubConnection | null = null;

  connectionState = signal<signalR.HubConnectionState>(signalR.HubConnectionState.Disconnected);

  async start(): Promise<void> {
    if(this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
    .withUrl(this.hubUrl,{
      accessTokenFactory: () => this.getAccessToken()
    })
    .withAutomaticReconnect()
    .build();

    this.connection.onreconnecting(() => this.connectionState.set(signalR.HubConnectionState.Reconnecting));
    this.connection.onreconnected(() => this.connectionState.set(signalR.HubConnectionState.Connected));
    this.connection.onclose(() => this.connectionState.set(signalR.HubConnectionState.Disconnected));

    await this.connection.start();
    this.connectionState.set(signalR.HubConnectionState.Connected);
  }

  async stop(): Promise<void> {
    await this.connection?.stop();
    this.connectionState.set(signalR.HubConnectionState.Disconnected);
  }

  async joinChat(chatId: number): Promise<void> {
    await this.ensureStarted();
    await this.connection?.invoke('JoinChat', chatId);
  }

  async leaveChat(chatId: number): Promise<void> {
    if(this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection?.invoke('LeaveChat', chatId);
    }
  }

  async markAsRead(chatId: number): Promise<void> {
    if(this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection?.invoke('MarkAsRead', chatId);
    }
  }

  onReceiveMessage(callback: (message: MessageDto) => void): void {
    this.connection?.on('ReceiveMessage', callback);
  }

  offReceiveMessage(callback: (message: MessageDto) => void): void {
    this.connection?.off('ReceiveMessage', callback);
  }

  onMessagesRead(callback: (event: MessagesReadEvent) => void): void {
    this.connection?.on('MessagesRead', callback);
  }

  offMessagesRead(callback: (event: MessagesReadEvent) => void): void {
    this.connection?.off('MessagesRead', callback);
  }

  onMessageDeletedForEveryone(
  callback: (event: MessageDeletedEvent) => void
): void {
  this.connection?.on('MessageDeletedForEveryone', callback);
}


offMessageDeletedForEveryone(
  callback: (event: MessageDeletedEvent) => void
): void {
  this.connection?.off('MessageDeletedForEveryone', callback);
}
  private async ensureStarted(): Promise<void> {
    if(!this.connection || this.connection.state === signalR.HubConnectionState.Disconnected) {
      await this.start();
    }
  }

  private getAccessToken(): string  {
    return this.authService.getToken() || '';
  }
}
