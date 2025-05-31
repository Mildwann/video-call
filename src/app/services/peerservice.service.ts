import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Peer, { DataConnection } from 'peerjs';

@Injectable({
  providedIn: 'root'
})
export class PeerserviceService {

  private peer: Peer;
  private _peerId = new BehaviorSubject<string>('');
  private _localStream = new BehaviorSubject<MediaStream | null>(null);
  private _remoteStream = new BehaviorSubject<MediaStream | null>(null);
  private dataConnection?: DataConnection;

  peerId$ = this._peerId.asObservable();
  localStream$ = this._localStream.asObservable();
  remoteStream$ = this._remoteStream.asObservable();

  constructor() {
    // Initialize PeerJS
    this.peer = new Peer({
      host: 'serverpeer-odsl.onrender.com',
      port: 443,
      path: '/peerjs',
      secure: true,
      debug: 3
    });

    this.setupPeerEvents();
  }
  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.peer?.open) {
        resolve();
      } else {
        this.peer.on('open', (id) => {
          console.log('Peer ready (from init):', id);
          this._peerId.next(id);
          resolve();
        });
  
        this.peer.on('error', (err) => {
          console.error('Peer init error:', err);
          reject(err);
        });
      }
    });
  }
  
  private setupPeerEvents() {
    this.peer.on('open', (id) => {
      console.log('PeerJS connection opened with ID:', id);
      this._peerId.next(id);
    });

    this.peer.on('call', (call) => {
      console.log('Incoming call from:', call.peer);
      const currentStream = this._localStream.getValue();
      if (currentStream) {
        call.answer(currentStream);
        call.on('stream', (remoteStream) => {
          this._remoteStream.next(remoteStream);
          remoteStream.getVideoTracks().forEach(track => {
            this.dataConnection?.send({
              type: 'video-toggled',
              disabled: !track.enabled
            });
          });
        });
      } else {
        console.warn('Incoming call but no local stream available');
      }
    });

    this.peer.on('connection', (conn: DataConnection) => {
      this.dataConnection = conn;
      this.dataConnection.on('data', (data) => {
        this.handleIncomingData(data);
      });
    });

    this.peer.on('error', (err) => console.error('PeerJS error:', err));
    this.peer.on('disconnected', () => console.log('PeerJS connection disconnected'));
    this.peer.on('close', () => console.log('PeerJS connection closed'));
  }

  isInCall(): boolean {
    return this._remoteStream.getValue() !== null;
  }

  async initializeLocalStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      this._localStream.next(stream);
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }

  callPeer(peerId: string) {
    const currentStream = this._localStream.getValue();
    if (!currentStream) {
      return;
    }

    const call = this.peer.call(peerId, currentStream);

    this.dataConnection = this.peer.connect(peerId);
    this.dataConnection.on('open', () => {
      console.log('Data connection opened with', peerId);
    });
    this.dataConnection.on('data', (data) => {
      this.handleIncomingData(data);
    });

    call.on('stream', (remoteStream) => {
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

  private handleIncomingData(data: any) {
    if (data.type === 'mic-toggled') {
      const remoteStream = this._remoteStream.getValue();
      if (remoteStream) {
        remoteStream.getAudioTracks().forEach(track => {
          track.enabled = !data.muted;
        });
      }
    }
    if (data.type === 'video-toggled') {
      const remoteStream = this._remoteStream.getValue();
      if (remoteStream) {
        remoteStream.getVideoTracks().forEach(track => {
          track.enabled = !data.disabled;
        });
      }
    }
  }

  getPeer() {
    return this.peer;
  }

  cleanup() {
    const currentStream = this._localStream.getValue();
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }

    if (this.peer) {
      this.peer.destroy();
    }
  }

  toggleMic() {
    const currentStream = this._localStream.getValue();
    if (currentStream) {
      const isCurrentlyMuted = currentStream.getAudioTracks().some(track => !track.enabled);
      currentStream.getAudioTracks().forEach(track => {
        track.enabled = isCurrentlyMuted;
      });

      if (this.dataConnection && this.dataConnection.open) {
        this.dataConnection.send({
          type: 'mic-toggled',
          muted: !isCurrentlyMuted
        });
      }

      return !isCurrentlyMuted;
    }
    return false;
  }

  toggleVideo() {
    const currentStream = this._localStream.getValue();
    if (currentStream) {
      let isCurrentlyEnabled = currentStream.getVideoTracks().some(track => track.enabled);
      currentStream.getVideoTracks().forEach(track => {
        track.enabled = !isCurrentlyEnabled;
      });

      if (this.dataConnection && this.dataConnection.open) {
        isCurrentlyEnabled = !isCurrentlyEnabled;
        this.dataConnection.send({
          type: 'video-toggled',
          disabled: !isCurrentlyEnabled
        });
      }

      return !isCurrentlyEnabled;
    }
    return false;
  }

}
