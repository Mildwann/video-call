// FirstPage
import { Component,OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {  CameraPermissionState } from '@capacitor/camera';
import { Platform } from '@ionic/angular';
import { AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';

import { PeerserviceService } from '../../services/peerservice.service';

@Component({
  selector: 'app-firstpage',
  templateUrl: 'firstpage.page.html',
  styleUrls: ['firstpage.page.scss'],
  standalone: false
})
export class FirstPage implements AfterViewInit,OnInit,ViewWillEnter {
  @ViewChild('miniViewVideo', { static: false }) miniViewVideo!: ElementRef<HTMLVideoElement>;
  isInCall:boolean=false;
  peerId: string = '';
  peerIdCallInput: string = '';
  permissionStatus: CameraPermissionState | null = null;
  showMiniView: boolean = false;
  navCtrl: any;
  isreload:boolean = false;
  callInfo: any = {
    peerId: '',
    isCallActive: false,
    remoteStreamsCount: 0
  };

  openMiniViewCall() {
    this.router.navigate(['/home', { peerIdCall:this.callInfo.peerIdOfCaller }]);
  }


  constructor(
    private router: Router,
    private platform: Platform,
    private peerService: PeerserviceService
  ) {
  
  }
  
  // Update the ionViewWillEnter method:

async ionViewWillEnter() {
  this.isInCall = this.peerService.isInCall();
  const navigation = this.router.getCurrentNavigation();
  const navState = history.state;

  if (navState?.reload) {
    const newState = { ...navState, reload: false };
    history.replaceState(newState, '');
    window.location.reload();
  }

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

  // Initialize camera only if in call
  if (this.isInCall) {
    try {
      await this.peerService.initializeLocalStream();
      console.log('Local media stream initialized for active call');
    } catch (error) {
      console.error('Error initializing media stream:', error);
    }
  }

  this.peerService.localStream$.subscribe(stream => {
    this.updateMiniView();
  });
}
  ngAfterViewInit() {
    if (this.showMiniView) {
      this.setupMiniView();
    }
    
  }
  private updateMiniView() {
    if (this.isInCall==true) {
       setTimeout(() => {
      this.peerService.localStream$.subscribe(stream => {
        this.miniViewVideo.nativeElement.srcObject = stream;
      });
    }, 1000);
    }
   
      
  }
  async ngOnInit() {
    console.log('FirstPage initialized');
    
    // Initialize peer connection and get our peer ID
    this.peerService.peerId$.subscribe(id => {
      console.log('Our peer ID:', id);
      this.peerId = id;
    });

    // Check for incoming call state from navigation
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.showMiniView = navigation.extras.state['showMiniView'] || false;
      this.callInfo = {
        peerId: navigation.extras.state['peerId'] || '',
        isCallActive: navigation.extras.state['isCallActive'] || false,
        remoteStreamsCount: navigation.extras.state['remoteStreamsCount'] || 0
      };
      console.log('Received call state:', this.callInfo);
    }
    // Initialize local media stream
    try {
      await this.peerService.initializeLocalStream();
      console.log('Local media stream initialized');
    } catch (error) {
      console.error('Error initializing media stream:', error);
      console.log('Camera/Microphone Access Required', 
                         'Please enable camera and microphone permissions to use this feature.');
    }
  }
  private setupMiniView() {
    console.log('Mini View Setup:', this.callInfo);
  }

  get isAndroidApp(): boolean {
    return this.platform.is('android');
  }

  // Create a new room
  createRoom() {
    this.router.navigate(['/home']).then(() => {
      window.location.reload();
    });  }
    // Create a new room
    tooroom() {
      this.router.navigate(['/home']).then(() => {
      });  }

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