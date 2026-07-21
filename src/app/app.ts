import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './shared/components/toast/toast';
import { CaseCreationFlowComponent } from './shared/components/case-creation-flow/case-creation-flow.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, CaseCreationFlowComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('لقاء');

  ngOnInit(): void {}
}