import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaginaCaja } from './pagina-caja';
import { SesionService } from '../../nucleo/auth/sesion.service';

function tokenConClaims(claims: Record<string, unknown>): string {
  const codificar = (parte: object) =>
    btoa(JSON.stringify(parte)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${codificar({ alg: 'HS256' })}.${codificar(claims)}.firma-falsa`;
}

/** HUF-007: la caja avisa si el comercio aún no fue verificado. */
describe('PaginaCaja — estado de verificación del comercio', () => {
  let http: HttpTestingController;
  let sesion: SesionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaCaja],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(SesionService);
  });

  afterEach(() => http.verify());

  it('con comercio PENDIENTE, muestra el aviso en vez del teclado', () => {
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO', comercioId: 'com-1' }));
    const fixture = TestBed.createComponent(PaginaCaja);
    fixture.detectChanges();

    http.expectOne('/api/comercios/com-1').flush({
      id: 'com-1',
      razonSocial: 'Café Central',
      nit: '900650321-2',
      estadoVerificacion: 'PENDIENTE',
      registradoEn: '2026-07-15T10:00:00Z',
    });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Tu comercio está en verificación');
    expect(html.querySelector('.teclado')).toBeNull();
  });

  it('con comercio VERIFICADO, muestra la caja normalmente', () => {
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO', comercioId: 'com-1' }));
    const fixture = TestBed.createComponent(PaginaCaja);
    fixture.detectChanges();

    http.expectOne('/api/comercios/com-1').flush({
      id: 'com-1',
      razonSocial: 'Café Central',
      nit: '900650321-2',
      estadoVerificacion: 'VERIFICADO',
      registradoEn: '2026-07-15T10:00:00Z',
    });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('.teclado')).not.toBeNull();
    expect(html.textContent).not.toContain('en verificación');
  });

  it('si la consulta falla, no bloquea la caja (fail-open: no perder ventas por un error de red)', () => {
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO', comercioId: 'com-1' }));
    const fixture = TestBed.createComponent(PaginaCaja);
    fixture.detectChanges();

    http.expectOne('/api/comercios/com-1').flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.teclado')).not.toBeNull();
  });
});
