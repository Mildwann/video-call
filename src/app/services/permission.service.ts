// permission.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  constructor() {}

  async requestMediaPermissions(): Promise<boolean> {
    try {
      // ขอสิทธิ์ทั้ง microphone และ camera พร้อมกัน
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      // ปิดสตรีมทันทีหลังจากได้สิทธิ์ (เราจะเปิดใหม่เมื่อต้องการใช้จริง)
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Permission denied:', error);
      return false;
    }
  }

  async checkMediaPermissions(): Promise<{ camera: PermissionState, microphone: PermissionState }> {
    if (!navigator.permissions) {
      throw new Error('Permissions API not supported');
    }

    const cameraPermission = await navigator.permissions.query({ name: 'camera' as any });
    const microphonePermission = await navigator.permissions.query({ name: 'microphone' as any });

    return {
      camera: cameraPermission.state,
      microphone: microphonePermission.state
    };
  }
}