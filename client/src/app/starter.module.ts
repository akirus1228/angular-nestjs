import { NgModule } from '@angular/core';
import { Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Routes, RouterModule } from '@angular/router';
import { Guard } from './guard';
import { Role } from 'shared';
import { AuthService } from './auth/auth.service';
import { InterceptorsService } from './shared/services/interceptors.service';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { APIService } from 'src/api/http.service';

@Component({
  selector: 'p-root',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  title = 'nest-angular';
}

const routes: Routes = [
  { path: '', redirectTo: 'login/app1', pathMatch: 'full' },
  { path: 'app1', loadChildren: 'src/app/app1/app1.module#App1Module', canActivate: [Guard], data: { roles: [Role.Admin, Role.app1] } },
  {
    path: 'webRTC', loadChildren: 'src/app/webRTC/webRTC.module#App2Module',
    canActivate: [Guard], data: { roles: [Role.Admin, Role.app2] }
  },
  { path: 'login/:site', loadChildren: 'src/app/auth/auth.module#AuthModule' },
  { path: '**', redirectTo: 'login/app1' }

];

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [BrowserModule, BrowserAnimationsModule, RouterModule.forRoot(routes), HttpClientModule],
  bootstrap: [AppComponent],
  providers: [Guard, AuthService, APIService,
    { provide: HTTP_INTERCEPTORS, useClass: InterceptorsService, multi: true }]
})
export class AppModule { }