import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview {
  protected readonly mobileSidebarOpen = signal(false);
  protected readonly casesMenuOpen = signal(false);

  protected toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  protected toggleCasesMenu(): void {
    this.casesMenuOpen.update((v) => !v);
  }
}
