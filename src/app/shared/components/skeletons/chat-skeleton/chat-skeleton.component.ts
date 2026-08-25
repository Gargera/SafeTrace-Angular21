import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col w-full h-full animate-pulse overflow-hidden">

      <!-- ================= HEADER ================= -->
      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 
        bg-surface-container-low border-b border-outline-variant 
        px-2.5 py-2 sm:px-md shrink-0 w-full overflow-hidden"
        dir="rtl">

        <!-- Right side -->
        <div class="flex items-center gap-2 min-w-0 flex-1">

          <!-- Back button -->
          <div
            class="w-7 h-7 rounded-full bg-surface-container-high shrink-0">
          </div>


          <!-- User info -->
          <div
            class="flex items-center gap-2 bg-surface-container-high 
            rounded-full px-2.5 py-1.5 min-w-0">

            <!-- Avatar -->
            <div
              class="w-8 h-8 sm:w-9 sm:h-9 rounded-full 
              bg-surface-container-highest shrink-0">
            </div>


            <!-- Name -->
            <div class="flex flex-col gap-1">
              <div
                class="h-3 bg-surface-container-highest rounded w-24">
              </div>

              <div
                class="h-2 bg-surface-container-highest rounded w-32">
              </div>
            </div>

          </div>


          <!-- Status -->
          <div
            class="h-6 w-20 bg-surface-container-high rounded-full shrink-0">
          </div>

        </div>


        <!-- Case info -->
        <div
          class="flex items-center gap-2 bg-surface-container-high 
          rounded-lg px-2.5 py-1 shrink-0">

          <!-- image -->
          <div
            class="w-6 h-6 rounded bg-surface-container-highest">
          </div>


          <div class="h-3 w-28 rounded bg-surface-container-highest">
          </div>

        </div>

      </div>



      <!-- ================= MESSAGES ================= -->

      <div
        class="flex-1 overflow-hidden flex flex-col gap-4 px-sm py-md sm:px-md"
        dir="ltr">


        <!-- Date -->
        <div class="flex justify-center">
          <div
            class="h-6 w-28 rounded-full bg-surface-container-high">
          </div>
        </div>


        @for(item of itemsArray; track $index){

          @if($index % 3 === 0){

            <!-- Other user message -->
            <div
              class="flex items-end gap-2 self-start max-w-[75%]">


              <div
                class="w-6 h-6 rounded-full bg-surface-container-high shrink-0">
              </div>


              <div class="flex flex-col gap-1">

                <div
                  class="h-10 bg-surface-container-high rounded-2xl rounded-bl-sm"
                  [style.width.px]="150 + ($index * 17 % 80)">
                </div>


                <div
                  class="h-2 w-12 rounded bg-surface-container-high">
                </div>

              </div>

            </div>


          } @else if($index % 3 === 1){


            <!-- My message -->

            <div
              class="flex flex-col items-end self-end max-w-[75%] gap-1">


              <div
                class="h-12 rounded-2xl rounded-br-sm bg-primary/20"
                [style.width.px]="140 + ($index * 13 % 90)">
              </div>


              <div
                class="h-2 w-10 rounded bg-surface-container-high">
              </div>


            </div>


          } @else {


            <!-- Long message -->

            <div
              class="flex items-end gap-2 self-start max-w-[75%]">


              <div
                class="w-6 h-6 rounded-full bg-surface-container-high shrink-0">
              </div>


              <div class="flex flex-col gap-1">


                <div
                  class="h-16 bg-surface-container-high rounded-2xl rounded-bl-sm"
                  [style.width.px]="200 + ($index * 11 % 60)">
                </div>


                <div
                  class="h-2 w-12 rounded bg-surface-container-high">
                </div>


              </div>


            </div>


          }

        }

      </div>




      <!-- ================= INPUT ================= -->

      <div
        class="shrink-0 flex items-center gap-xs sm:gap-sm
        px-sm py-sm sm:px-md
        bg-surface-container-low
        border-t border-outline-variant"
        dir="rtl">


        <!-- Input -->
        <div
          class="flex-1 h-10 rounded-full bg-surface-container-high">
        </div>


        <!-- Attach -->
        <div
          class="w-8 h-8 rounded-full bg-surface-container-high shrink-0">
        </div>


        <!-- Send -->
        <div
          class="w-9 h-9 rounded-full bg-primary/20 shrink-0">
        </div>


      </div>


    </div>
  `,
})
export class ChatSkeletonComponent {

  readonly items = input<number>(8);

  get itemsArray(): number[] {
    return Array.from(
      { length: this.items() },
      (_, i) => i
    );
  }

}