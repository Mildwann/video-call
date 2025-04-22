import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirstPage } from './firstpage.page';

describe('FirstpagePage', () => {
  let component: FirstPage;
  let fixture: ComponentFixture<FirstPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FirstPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
