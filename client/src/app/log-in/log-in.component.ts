import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { ConfigurationService } from '../configuration.service';

@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.less']
})
export class LogInComponent implements OnInit {
  credentials: FormGroup;
  defaults = new FormControl();

  constructor(private configuration: ConfigurationService, private fb: FormBuilder) { }

  ngOnInit() {
    this.credentials = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.defaults.valueChanges.subscribe(value => {
      switch (value) {
        case 'guest':
          this.credentials.setValue({ username: 'guest', password: 'guest' });
          break;
        case 'user':
          this.credentials.setValue({ username: 'user', password: 'user' });
          break;
        case 'admin':
          this.credentials.setValue({ username: 'admin', password: 'admin' });
          break;
      }
    });
  }

  login() {
    let { username, password } = this.credentials.value;
    this.configuration.login(username, password).subscribe(console.log.bind('login'));
  }
}
