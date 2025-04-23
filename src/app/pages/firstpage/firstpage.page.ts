// FirstPage
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Camera, CameraPermissionState } from '@capacitor/camera';
import { Platform } from '@ionic/angular';
import { AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { VideoCallService } from '../../services/video-call.service';


@Component({
  selector: 'app-firstpage',
  templateUrl: 'firstpage.page.html',
  styleUrls: ['firstpage.page.scss'],
  standalone: false
})
export class FirstPage implements AfterViewInit {
  @ViewChild('miniViewVideo', { static: false }) miniViewVideo!: ElementRef<HTMLVideoElement>;

  peerIdCallInput: string = '';
  permissionStatus: CameraPermissionState | null = null;
  showMiniView: boolean = false;
  navCtrl: any;

  callInfo: any = {
    peerId: '',
    isCallActive: false,
    remoteStreamsCount: 0
  };

  openMiniViewCall() {
    this.router.navigate(['/home', { peerIdCall:this.callInfo.peerIdOfCaller }]);
  }
  constructor(
    private videoCallService: VideoCallService,
    private router: Router,
    private platform: Platform
  ) {

    // Check if we're coming from home page with MiniView enabled  const navigation = this.router.getCurrentNavigation();
   const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.showMiniView = navigation.extras.state['showMiniView'] || false;
      this.callInfo = {
        peerId: navigation.extras.state['peerId'] || '',
        peerIdOfCaller: navigation.extras.state['peerIdOfCaller'] || '',
        remotepeer: navigation.extras.state['remotepeer'] || '',
        isCallActive: navigation.extras.state['isCallActive'] || false,
        remoteStreamsCount: navigation.extras.state['remoteStreamsCount'] || 0
      };
    }
  }
  ngAfterViewInit() {
    if (this.showMiniView) {
      this.setupMiniView();
    }
  }
  private setupMiniView() {
    // ตัวอย่างการแสดงข้อมูลการโทร
    console.log('Mini View Setup:', this.callInfo);
    // const stream = this.videoCallService.remoteStream;
    // console.log(stream);
    
    // if (stream && this.miniViewVideo?.nativeElement) {
    //   const videoEl = this.miniViewVideo.nativeElement;
    //   videoEl.srcObject = stream;
    //   videoEl.play().catch(err => console.error('Mini video play error:', err));
    // } else {
    //   console.warn('No remote stream available in firstpage.');
    // }
    // ในกรณีจริงคุณอาจจะต้องการเชื่อมต่อกับ PeerJS อีกครั้งเพื่อรับสตรีม
    // หรือใช้วิธีอื่นในการแสดงวิดีโอ
  }

  get isAndroidApp(): boolean {
    return this.platform.is('android');
  }

  // Create a new room
  createRoom() {
    this.router.navigate(['/home']);
  }

  // Join the room using Peer ID
  joinRoom(peerIdCall: string) {
    if (!peerIdCall) {
      alert('Please enter a valid Peer ID');
      return;
    }
    this.router.navigate(['/home', { peerIdCall }]);
  }

  // Open the alert for joining a room
  openJoinPopup() {
    this.router.navigate([], { skipLocationChange: true }).then(() => {
      const alert = document.createElement('ion-alert');
      alert.header = 'Join a Room';
      alert.subHeader = 'Enter Peer ID to join a video call';
      alert.message = 'Please enter the unique peer ID provided to you.';
      alert.inputs = [
        {
          name: 'peerIdCall',
          type: 'text',
          placeholder: 'Enter Peer ID',
          value: this.peerIdCallInput,
          id: 'peer-id-input',
        },
      ];
      alert.buttons = [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => alert.remove(),
        },
        {
          text: 'Join',
          handler: (data) => {
            this.peerIdCallInput = data.peerIdCall;
            this.joinRoom(data.peerIdCall);
            alert.remove();
          },
        },
      ];
      document.body.appendChild(alert);
      alert.present();
    });
  }
}