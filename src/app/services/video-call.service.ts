import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VideoCallService {
  private _remoteStream: MediaStream | null = null;

  set remoteStream(stream: MediaStream | null) {
    this._remoteStream = stream;
  }

  get remoteStream(): MediaStream | null {
    return this._remoteStream;
  }
}
