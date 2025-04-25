// video-call.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Peer from 'peerjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class PeerserviceService {
  private peer: Peer;
  private socket: Socket;
  private _peerId = new BehaviorSubject<string>('');
  private _localStream = new BehaviorSubject<MediaStream | null>(null);
  private _remoteStream = new BehaviorSubject<MediaStream | null>(null);

  peerId$ = this._peerId.asObservable();
  localStream$ = this._localStream.asObservable();
  remoteStream$ = this._remoteStream.asObservable();

  constructor() {
    
    // Initialize Socket.io connection
    this.socket = io('http://192.168.137.164:3000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Initialize PeerJS
    this.peer = new Peer({
      host: '192.168.137.164',
      port: 9000,
      path: '/peerjs',
      secure: false,
      debug: 3
    });

    this.setupPeerEvents();
    this.setupSocketEvents();
  }

  private setupPeerEvents() {
    
    this.peer.on('open', (id) => {
      console.log('PeerJS connection opened with ID:', id);
      this._peerId.next(id);
      this.socket.emit('register-peer', id);
    });

    this.peer.on('call', (call) => {
      console.log('Incoming call from:', call.peer);
      const currentStream = this._localStream.getValue();
      if (currentStream) {
        console.log('Answering call with local stream');
        call.answer(currentStream);
        
        call.on('stream', (remoteStream) => {
          console.log('Received remote stream from:', call.peer);
          this._remoteStream.next(remoteStream);
        });
      } else {
        console.warn('Incoming call but no local stream available');
      }
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS error:', err);
    });

    this.peer.on('disconnected', () => {
      console.log('PeerJS connection disconnected');
    });

    this.peer.on('close', () => {
      console.log('PeerJS connection closed');
    });
  }

  private setupSocketEvents() {
    console.log('Setting up Socket.io events...');
    
    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      const currentId = this._peerId.getValue();
      if (currentId) {
        console.log('Registering peer with signaling server:', currentId);
        this.socket.emit('register-peer', currentId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
    });

    this.socket.on('peer-connected', (peerId: string) => {
      console.log('New peer connected via signaling:', peerId);
    });

    this.socket.on('peer-disconnected', (peerId: string) => {
      console.log('Peer disconnected via signaling:', peerId);
    });

    this.socket.on('error', (err: any) => {
      console.error('Socket.io error:', err);
    });
  }
  isInCall(): boolean {
    return this._remoteStream.getValue() !== null;
  }
  async initializeLocalStream() {
    console.log('Initializing local media stream...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      console.log('Successfully obtained local media stream');
      this._localStream.next(stream);
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }

  callPeer(peerId: string) {
    console.log('Attempting to call peer:', peerId);
    const currentStream = this._localStream.getValue();
    if (!currentStream) {
      console.warn('Cannot call peer - no local stream available');
      return;
    }

    console.log('Initiating call to peer:', peerId);
    const call = this.peer.call(peerId, currentStream);
    
    call.on('stream', (remoteStream) => {
      console.log('Received remote stream from called peer:', peerId);
      this._remoteStream.next(remoteStream);
    });

    call.on('close', () => {
      console.log('Call to peer closed:', peerId);
    });

    call.on('error', (err) => {
      console.error('Call error with peer:', peerId, err);
    });

    return call;
  }

  getPeer() {
    console.log('Getting PeerJS instance');
    return this.peer;
  }

  getSocket() {
    console.log('Getting Socket.io instance');
    return this.socket;
  }

  cleanup() {
    console.log('Cleaning up resources...');
    const currentStream = this._localStream.getValue();
    if (currentStream) {
      console.log('Stopping local media stream tracks');
      currentStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.peer) {
      console.log('Destroying PeerJS connection');
      this.peer.destroy();
    }
    
    if (this.socket) {
      console.log('Disconnecting Socket.io');
      this.socket.disconnect();
    }
  }
}