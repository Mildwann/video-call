// FirstPage
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Camera, CameraPermissionState } from '@capacitor/camera';

@Component({
  selector: 'app-firstpage',
  templateUrl: 'firstpage.page.html',
  styleUrls: ['firstpage.page.scss'],
  standalone: false
})
export class FirstPage {
  peerIdCallInput: string = '';
  permissionStatus: CameraPermissionState | null = null;

  constructor(private router: Router) {}

  // Create a new room
  createRoom() {
    const peerIdCall = Math.random().toString(36).substring(7); // Generate Peer ID
    this.router.navigate(['/home', { }]); // Pass Peer ID as route parameter
  }

  // Join the room using Peer ID
  joinRoom(peerIdCall: string) {
    if (!peerIdCall) {
      alert('Please enter a valid Peer ID');
      return;
    }
    this.router.navigate(['/home', { peerIdCall }]); // Navigate to Video Call page with peerIdCall
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
            this.peerIdCallInput = data.peerIdCall; // Capture entered Peer ID
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
