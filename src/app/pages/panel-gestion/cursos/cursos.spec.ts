import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CursosComponent } from './cursos';
import { AdminCoursesService } from '../../../services/admin-courses';
import { AuthService } from '../../../services/auth';
import { Router } from '@angular/router';

describe('CursosComponent', () => {
  let component: CursosComponent;
  let fixture: ComponentFixture<CursosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CursosComponent],
      providers: [
        {
          provide: AdminCoursesService,
          useValue: {
            list: () => of([]),
            create: () => of({ id: '1', titulo: 'x' }),
            update: () => of({ id: '1', titulo: 'x' }),
            remove: () => of(void 0),
          },
        },
        {
          provide: AuthService,
          useValue: { logout: () => {} },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: () => Promise.resolve(true) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CursosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
