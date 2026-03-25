import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home/home';
import { CursoDetalle } from './pages/curso-detalle/curso-detalle/curso-detalle';
import { LoginComponent } from './pages/panel-gestion/login/login';
import { CursosComponent } from './pages/panel-gestion/cursos/cursos';
import { adminChildGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'curso/:id', component: CursoDetalle },

  {
    path: 'panel-gestion',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },

      // Login queda sin guard
      { path: 'login', component: LoginComponent },

      // Todo lo demás del panel queda protegido acá adentro
      {
        path: '',
        canActivateChild: [adminChildGuard],
        children: [
          { path: 'cursos', component: CursosComponent },
          // futuras pantallas: { path: 'usuarios', component: UsuariosComponent }, etc.
        ],
      },
    ],
  },
];
