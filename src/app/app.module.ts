import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { PeerserviceService } from './services/peerservice.service';

export function initializeApp(peerService: PeerserviceService) {
  return () => peerService.init(); // 👈 รัน init แล้วรอ resolve ก่อน bootstrap
}
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [PeerserviceService],
      multi: true
    }

  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
