import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FoundedPerson } from '../../models/founded-model';
import { FoundedService } from '../../service/founded.service';

@Component({
  selector: 'app-founded-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './founded-card.component.html',
})
export class FoundedCardComponent {
  @Input() person!: FoundedPerson;
  @Input() statusLabel = 'تم العثور عليه';

  constructor(private foundedService: FoundedService) {}

  get imageUrl(): string {
    return this.foundedService.getImageUrl(this.person.image);
  }

  get formattedDate(): string {
    if (!this.person.foundedAt) return '';
    const date = new Date(this.person.foundedAt);
    return date.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
