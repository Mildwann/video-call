import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';
import { PeerserviceService } from '../services/peerservice.service';


interface RemoteStream {
  peerId: string;
  stream: MediaStream;
  call?: any;
  isMuted?: boolean;  
  isVideoOn?: boolean; 
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;

  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  remoteStreams: RemoteStream[] = [];
  private connectedPeers: Set<string> = new Set();

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
    private router2: Router,  // เพิ่ม Router
    private platform: Platform,
    private PeerserviceService: PeerserviceService
  ) {
    this.route.paramMap.subscribe(params => {
      const peerId = params.get('peerIdCall');
      if (peerId) {
        this.peerIdToCall = peerId;
        this.PeerserviceService.callPeer(peerId);
      }
    });

    this.PeerserviceService.remoteStream$.subscribe(stream => {
      if (stream) {
        this.remoteStreams = [{ stream, peerId: this.peerIdToCall }];
      } else {
        this.remoteStreams = [];
      }
    });
    this.PeerserviceService.localStream$.subscribe(stream => {
      this.localStream = stream;
      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = stream;
      }
    });
  
    this.PeerserviceService.remoteStream$.subscribe(streams => {
      this.remoteStream = streams;
    });
  
    this.initializeMediaStream();
  }

  goToHome() {
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
  
    this.router2.navigate(['/firstpage'], navigationExtras);
  }

  async ngOnInit() {
    
    
  }

  ngOnDestroy() {
  }

  get isAndroidApp(): boolean {
    return this.platform.is('android');
  }
  ngAfterViewInit() {
    if (this.isAndroidApp) {
    }
  }



  toggleParticipants() {
    this.showParticipants = !this.showParticipants;

  }

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


  async initializeMediaStream() {
    try {

      this.localStream = await this.PeerserviceService.initializeLocalStream();
      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = this.localStream;
      }
      if (this.localVideo) {
        this.localVideo.nativeElement.muted = true;  // ตั้งค่าให้มันวิดีโอเงียบ
      }
    } catch (error) {
      console.error('Error initializing media:', error);
      // Handle error (show alert, etc.)
    }
  }


  async toggleMic() {
    this.isMicMuted = !this.isMicMuted;
    this.PeerserviceService.toggleMic();
  }

  async toggleVideo() {
    this.isVideoEnabled = !this.isVideoEnabled;
    this.PeerserviceService.toggleVideo();
    if (this.isMiniView) {
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

    const navigationExtras: NavigationExtras = {
      state: {
        reload: true,
      }
    };
    // นำทางกลับไปหน้า firstpage
    this.router2.navigate(['/firstpage'], navigationExtras);
  }
  
  async copyPeerId() {
    this.PeerserviceService.peerId$.subscribe(value => {
    this.peerId = value;
    });
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

 

  private async showAlert(header: string, message: string, error?: unknown) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}