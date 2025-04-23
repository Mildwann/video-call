import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import Peer from 'peerjs';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';
import { NavigationStart } from '@angular/router';
import { VideoCallService } from '../services/video-call.service'; // import



interface RemoteStream {
  peerId: string;
  stream: MediaStream;
  call?: any;
  isMuted?: boolean;  // Add this property
  isVideoOn?: boolean; // Add this property
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('localVideoMini', { static: false }) localVideoMini!: ElementRef<HTMLVideoElement>;

  private peer: Peer;
  private socket: Socket;
  private localStream: MediaStream | null = null;
  remoteStreams: RemoteStream[] = [];
  private connectedPeers: Set<string> = new Set();
  private currentCallInfo: any = null;

  peerIdToCall: string = '';
  peerId: string = '';
  isMicMuted: boolean = false;
  isVideoEnabled: boolean = true;
  isCallActive: boolean = false;

  isSpeakerView: boolean = false;
  showParticipants: boolean = false;
  isSharingScreen: boolean = false;
  peerIdOfCaller:string='';
  isMiniView = false;

  constructor(
    private route: ActivatedRoute,
    private alertController: AlertController,
    private router: Router,  // เพิ่ม Router
    private platform: Platform,
    private videoCallService: VideoCallService

  ) {
    // Initialize Socket.io connection
    this.socket = io('http://10.32.71.152:3000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Initialize PeerJS
    this.peer = new Peer({
      host: '10.32.71.152',
      port: 9000,
      path: '/peerjs',
      secure: false,
      debug: 3
    });

    this.setupPeerEvents();
    this.setupSocketEvents();
  }


  goToHome() {
    this.isMiniView = true;
    let peerIdFromUrl = this.route.snapshot.paramMap.get('peerIdCall') || this.peerIdOfCaller;
  
    // ดึงค่า peerIdCall จาก URL (จาก paramMap หรือ snapshot)
    if (this.peerIdOfCaller!='') {
       peerIdFromUrl = this.peerIdOfCaller;
    }
  
    const navigationExtras: NavigationExtras = {
      state: {
        showMiniView: true,
        peerId: this.peerId,
        isCallActive: this.isCallActive,
        remoteStreamsCount: this.remoteStreams.length,
        peerIdOfCaller: peerIdFromUrl
      }
    };
  
    console.log("peerIdOfCaller from URL or fallback:", peerIdFromUrl);
  
    setTimeout(() => {
      this.router.navigate(['/firstpage'], navigationExtras);
    }, 300);
  }

  async ngOnInit() {
    try {
      await this.initializeMediaStream();
      this.updateMiniViewStream(); // เพิ่มบรรทัดนี้

      this.route.paramMap.subscribe(async (params) => {
        const peerId = params.get('peerIdCall');
        if (peerId) {
          this.peerIdToCall = peerId;
          await this.callPeer(peerId);
        }
      });


    } catch (error) {
      console.error('Error initializing:', error);
      this.showAlert('Error', 'Could not access camera and micropho');
    }

  }

  ngOnDestroy() {
    this.cleanup();
  }

  get isAndroidApp(): boolean {
    return this.platform.is('android');
  }
  ngAfterViewInit() {
    if (this.isAndroidApp) {
      this.updateMiniViewStream();
    }
  }

  private updateMiniViewStream() {
    console.log('กำลังอัปเดต MiniView');
    if (this.isAndroidApp && this.localVideoMini?.nativeElement && this.localStream) {
      console.log('MiniView: กำลังตั้งค่า stream');
      this.localVideoMini.nativeElement.srcObject = this.localStream;
      
    } else {
      console.warn('MiniView: ไม่พบ video element หรือ stream');
    }
  }

  async enterPiP() {
    const video: HTMLVideoElement = this.localVideo?.nativeElement;

    if (video && video.requestPictureInPicture) {
      try {
        await video.requestPictureInPicture();
      } catch (err) {
        console.error("Error entering PiP:", err);
      }
    } else {
      console.warn("Picture-in-Picture is not supported.");
    }
  }

  async exitPiP() {
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (err) {
        console.error("Error exiting PiP:", err);
      }
    }
  }

  toggleMiniView() {
    this.isMiniView = !this.isMiniView;
    if (this.isMiniView) {
      setTimeout(() => this.updateMiniViewStream(), 100); // ให้เวลาสร้าง DOM
    }
  }

  toggleParticipants() {
    this.showParticipants = !this.showParticipants;

  }

  // Add this method to update participant status
  updateParticipantStatus(peerId: string, isMuted: boolean, isVideoOn: boolean) {
    const participant = this.remoteStreams.find(p => p.peerId === peerId);
    if (participant) {
      participant.isMuted = isMuted;
      participant.isVideoOn = isVideoOn;
    }

  }
  async shareScreen() {
    try {
      // หยุดวิดีโอจากกล้องชั่วคราว
      const videoTrack = this.localStream?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
      }

      // รับสตรีมหน้าจอ
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // สร้าง MediaStream ใหม่ที่รวมทั้งกล้องและหน้าจอ
      const newStream = new MediaStream();

      // เพิ่ม track ของกล้องเข้าไปใน MediaStream ใหม่
      this.localStream?.getAudioTracks().forEach(track => newStream.addTrack(track)); // เพิ่มออดิโอ
      screenStream.getVideoTracks().forEach(track => newStream.addTrack(track)); // เพิ่มวิดีโอจากหน้าจอ

      // เพิ่มวิดีโอจากกล้องถ้ามี
      if (videoTrack) {
        newStream.addTrack(videoTrack);
      }

      // อัปเดต localStream และแสดงผล
      this.localStream = newStream;
      this.localVideo.nativeElement.srcObject = this.localStream;

      // ส่งสตรีมใหม่ไปยัง peer ทั้งหมดที่เชื่อมต่ออยู่
      this.remoteStreams.forEach(remote => {
        if (remote.call) {
          const senders = remote.call.peerConnection.getSenders();
          const videoSender = senders.find((s: { track: { kind: string; }; }) => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(this.localStream!.getVideoTracks()[0]);
          }
        }
      });

      // จัดการเมื่อหยุดแชร์หน้าจอ
      screenStream.getVideoTracks()[0].onended = () => {
        // กลับไปใช้กล้องปกติ
        const cameraStream = new MediaStream();
        this.localStream?.getAudioTracks().forEach(track => cameraStream.addTrack(track));
        if (videoTrack) {
          videoTrack.enabled = true;
          cameraStream.addTrack(videoTrack);
        }

        this.localStream = cameraStream;
        this.localVideo.nativeElement.srcObject = this.localStream;

        // อัปเดต peer ทั้งหมด
        this.remoteStreams.forEach(remote => {
          if (remote.call) {
            const senders = remote.call.peerConnection.getSenders();
            const videoSender = senders.find((s: { track: { kind: string; }; }) => s.track?.kind === 'video');
            if (videoSender && videoTrack) {
              videoSender.replaceTrack(videoTrack);
            }
          }
        });
      };
    } catch (error) {
      console.error('Error sharing screen:', error);
      // หากเกิดข้อผิดพลาด ให้กลับไปใช้กล้องปกติ
    }
  }

  toggleSpeakerView() {
    this.isSpeakerView = !this.isSpeakerView;
  }


  private async initializeMediaStream() {
    try {
      if (this.isRunningInApp()) {
        // สำหรับแอพ
        await this.initializeWithCapacitor();

      } else {
        await this.initializeWithWebRTC();
      }
    } catch (error) {
      console.error('Error getting user media:', error);
      this.showAlert('Error', 'Could not access', error);
      throw error;
    }
  }

  private isRunningInApp(): boolean {
    return !!(window as any).Capacitor;
  }

  private async initializeWithWebRTC() {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: true,
    });
    this.localVideo.nativeElement.srcObject = this.localStream;
  }

  private async initializeWithCapacitor() {
    const { Camera } = await import('@capacitor/camera');

    // ตรวจสอบ permission ก่อน
    const permissionStatus = await Camera.checkPermissions();
    if (permissionStatus.camera !== 'granted') {
      const newPermissions = await Camera.requestPermissions();
      if (newPermissions.camera !== 'granted') {
        throw new Error('Permission denied');
      }
    }

    // เปิดกล้องแบบ native
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true, // ใช้ค่ามาตรฐานของอุปกรณ์
      audio: true
    });

    this.localVideo.nativeElement.srcObject = this.localStream;
  }


  private setupPeerEvents() {
    
    console.log("set up peer");
    this.peer.on('open', (id) => {
      this.peerId = id;
      console.log('My peer ID is: ' + id);
      this.socket.emit('register-peer', id);
    });

    this.peer.on('call', (call) => {
      console.log('Incoming call from:', call.peer);
      this.peerIdOfCaller = call.peer;

      // Answer the call with our local stream
      call.answer(this.localStream!);

      // Handle the remote stream
      call.on('stream', (remoteStream) => {
        this.addRemoteStream(call.peer, remoteStream, call);
        this.isCallActive = true;
        this.videoCallService.remoteStream = remoteStream;  // เก็บไว้ใช้ภายหลัง
        console.log("saving vdoooooooooo",remoteStream);

      });

      // Handle call ending
      call.on('close', () => {
        this.removeRemoteStream(call.peer);
        this.checkCallStatus();
      });

      call.on('error', (err) => {
        console.error('Call error:', err);
        this.removeRemoteStream(call.peer);
        this.checkCallStatus();
      });
    });

    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
      this.showAlert('Connection Errorr', err.message);
    });

    this.peer.on('disconnected', () => {
      console.log('Peer disconnected, attempting to reconnect...');
      this.peer.reconnect();
    });
  }

  private setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      if (this.peerId) {
        this.socket.emit('register-peer', this.peerId);
      }
    });

    this.socket.on('peer-connected', (peerId: string) => {
      if (peerId !== this.peerId && !this.connectedPeers.has(peerId)) {
        console.log('New peer connected:', peerId);
        this.connectedPeers.add(peerId);
        this.callPeer(peerId);
      }
    });

    this.socket.on('peer-disconnected', (peerId: string) => {
      console.log('Peer disconnected:', peerId);
      this.connectedPeers.delete(peerId);
      this.removeRemoteStream(peerId);
      this.checkCallStatus();
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
    });

    this.socket.on('error', (err: any) => {
      console.error('Socket error:', err);
    });
  }

  async callPeer(peerId: string) {
    if (!peerId || peerId === this.peerId || this.remoteStreams.some(rs => rs.peerId === peerId)) {
      return;
    }

    try {
      const call = this.peer.call(peerId, this.localStream!);
      this.connectedPeers.add(peerId);

      call.on('stream', (remoteStream) => {
        this.addRemoteStream(peerId, remoteStream, call);
        this.isCallActive = true;
      });

      call.on('close', () => {
        this.removeRemoteStream(peerId);
        this.checkCallStatus();
      });

      call.on('error', (err) => {
        console.error('Call error:', err);
        this.removeRemoteStream(peerId);
        this.checkCallStatus();
      });

    } catch (error) {
      console.error('Error calling peer:', error);
      this.showAlert('Call Error', 'Failed to establish connection');
    }
  }

  private addRemoteStream(peerId: string, stream: MediaStream, call?: any) {
    if (!this.remoteStreams.some(rs => rs.peerId === peerId)) {
      this.remoteStreams.push({ peerId, stream, call });
    }
  }

  private removeRemoteStream(peerId: string) {
    const index = this.remoteStreams.findIndex(rs => rs.peerId === peerId);
    if (index !== -1) {
      // Stop all tracks in the stream
      this.remoteStreams[index].stream.getTracks().forEach(track => track.stop());

      // Close the call if it exists
      if (this.remoteStreams[index].call) {
        this.remoteStreams[index].call.close();
      }

      this.remoteStreams.splice(index, 1);
      this.connectedPeers.delete(peerId);
    }
  }

  private checkCallStatus() {
    this.isCallActive = this.remoteStreams.length > 0;
  }

  async toggleMic() {
    if (this.localStream) {
      this.isMicMuted = !this.isMicMuted;
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMicMuted;
      });

      // Notify all connected peers about the mute status change
      this.remoteStreams.forEach(remote => {
        if (remote.call && remote.call.peerConnection) {
          const senders = remote.call.peerConnection.getSenders();
          const audioSender = senders.find((s: any) => s.track && s.track.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(this.localStream!.getAudioTracks()[0]);
          }
        }

      });
    }
  }

  async toggleVideo() {
    if (this.localStream) {
      this.isVideoEnabled = !this.isVideoEnabled;
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = this.isVideoEnabled;
      });

      // Notify all connected peers about the video status change
      this.remoteStreams.forEach(remote => {
        if (remote.call && remote.call.peerConnection) {
          const senders = remote.call.peerConnection.getSenders();
          const videoSender = senders.find((s: any) => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(this.localStream!.getVideoTracks()[0]);
          }
        }
      });
      if (this.isMiniView) {
        this.updateMiniViewStream();
      }
    }
  }

  async endCall() {
    // ปิดทุกสายที่เชื่อมต่อ
    this.remoteStreams.forEach(remote => {
      if (remote.call) {
        remote.call.close();
      }
    });

    // หยุดสตรีมทั้งหมด
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.remoteStreams = [];
    this.connectedPeers.clear();
    this.isCallActive = false;

    // นำทางกลับไปหน้า firstpage
    this.router.navigate(['/firstpage']).then(() => {
      window.location.reload();
    });
  }
  async copyPeerId() {
    if (this.peerId) {
      try {
        await navigator.clipboard.writeText(this.peerId);
        this.showAlert('Copied', 'Peer ID copied to clipboard');
      } catch (error) {
        console.error('Failed to copy:', error);
        this.showAlert('Error', 'Failed to copy Peer ID');
      }
    }
  }

  private cleanup() {
    this.endCall();

    // Clean up local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      if (this.localVideo && this.localVideo.nativeElement) {
        this.localVideo.nativeElement.srcObject = null;
      }
      this.localStream = null;
    }

    // Disconnect from signaling server
    if (this.socket) {
      this.socket.disconnect();
    }

    // Destroy PeerJS connection
    if (this.peer) {
      this.peer.destroy();
    }
  }

  private async showAlert(header: string, message: string, error?: unknown) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}