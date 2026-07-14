import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.aria-hidden]="true"
      [class]="iconClasses()"
      [style.transform]="rotation() ? 'rotate(' + rotation() + 'deg)' : null"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <ng-content />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly size = input('1rem');
  readonly extraClass = input('');
  readonly rotation = input(0);

  protected iconClasses(): string {
    const size = this.size();
    const classes = [`h-[${size}]`, `w-[${size}]`, this.extraClass()].filter(Boolean);
    return classes.join(' ').trim();
  }
}
