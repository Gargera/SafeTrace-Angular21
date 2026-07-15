import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgeBadgeDirective } from '../../../../shared/directives/age-badge-directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge-directive';


@Component({
  selector: 'app-my-cases-tab',
  standalone: true,
  imports: [],
  templateUrl: './cases-tab.html',
})
export class MyCasesTab   {
 
}
