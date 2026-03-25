import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatFloatComponent  } from './chat-float';

describe('ChatFloat', () => {
  let component: ChatFloatComponent ;
  let fixture: ComponentFixture<ChatFloatComponent >;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatFloatComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatFloatComponent );
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
