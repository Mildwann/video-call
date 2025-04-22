import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'webrtcApp',
  webDir: 'www',
  server: {
    cleartext: true, // อนุญาตให้ใช้ HTTP ได้
    androidScheme: 'http',
    allowNavigation: [
      "http://192.168.137.119:9000", 
      "http://192.168.137.119:3000",  // เพิ่ม URL ของเซิร์ฟเวอร์ที่ใช้ HTTP
    ]
  },
  
};

export default config;
