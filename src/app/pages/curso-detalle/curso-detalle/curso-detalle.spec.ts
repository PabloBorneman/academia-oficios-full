import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CursoDetalle } from './curso-detalle';

describe('CursoDetalle', () => {
  let component: CursoDetalle;
  let fixture: ComponentFixture<CursoDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CursoDetalle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CursoDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
