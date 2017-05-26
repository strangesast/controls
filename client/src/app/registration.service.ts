import { Input, Output, EventEmitter, Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Http } from '@angular/http';
import { Observable, ReplaySubject } from 'rxjs';

var lastMessageId = 0;

@Injectable()
export class RegistrationService implements Resolve<Observable<null>> {
  socket;
  SOCKET_URL = `ws:${ location.origin.substring(location.protocol.length) }/socket`;
  registeredTemplate = new ReplaySubject(1);

  get template() {
    return this.registeredTemplate.take(1)
  }
  set template(template) {
    this.send({ command: { type: 'template', data: template }});
  }

  constructor(private http: Http) { }

  resolve() {
    return this.init()
  }

  init() {
    return this.http.get(`${ location.origin }/socket/session`)
      .map(() => {
        this.socket = Observable.webSocket(this.SOCKET_URL)
        let validCommands = this.socket.filter(message => message.command && message.command.type);
        validCommands.pluck('command')
          .filter(({ type }) => type == 'template')
          .pluck('data')
          .do(x => console.log('from socket', x))
          .subscribe(this.registeredTemplate);
      });
  }

  send(message) {
    this.socket.next(JSON.stringify(message));
  }
}