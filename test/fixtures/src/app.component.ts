import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-counter',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
  private readonly host = inject(ElementRef);
  readonly label = input.required<string>();
  readonly changed = output<number>();
  readonly count = signal(0);
  readonly double = computed(() => this.count() * 2);

  increment(): void {
    this.count.update((value) => value + 1);
    this.changed.emit(this.count());
  }
}
