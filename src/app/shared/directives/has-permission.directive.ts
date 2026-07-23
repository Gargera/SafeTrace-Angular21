import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);
  private _permission: string | string[] = '';
  private isHidden = true;

  @Input() set hasPermission(permission: string | string[]) {
    this._permission = permission;
    this.updateView();
  }

  constructor() {
    effect(() => {
      this.authService.currentUser();
      this.updateView();
    });
  }

  private updateView() {
    let hasPermission = false;
    
    if (Array.isArray(this._permission)) {
      hasPermission = this._permission.some(p => this.authService.hasPermission(p));
    } else {
      hasPermission = this.authService.hasPermission(this._permission);
    }

    if (hasPermission && this.isHidden) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.isHidden = false;
    } else if (!hasPermission && !this.isHidden) {
      this.viewContainer.clear();
      this.isHidden = true;
    }
  }
}
