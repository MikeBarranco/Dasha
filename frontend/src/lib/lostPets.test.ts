import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLostPetReport, type LostPetInput } from './lostPets';

// Verifica el cuerpo EXACTO que el frontend manda al publicar una mascota
// perdida (POST /lost-pets), para que el contrato con el backend no se rompa.

function mockFetchOk() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ id: 'lp1' }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof mockFetchOk>): Record<string, unknown> {
  // El tipo del mock no conoce los argumentos de fetch; los leemos con un cast.
  const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit?] | undefined;
  const options = call?.[1];
  return JSON.parse((options?.body as string) ?? '{}');
}

const base: LostPetInput = {
  petName: 'Firulais',
  species: 'perro',
  size: 'Mediano',
  color: 'Café',
  lastSeenAt: '2026-08-30',
  lat: 19.04,
  lng: -98.2,
  searchRadiusKm: 3,
  description: 'Se perdió cerca del parque',
  contactName: 'Ana',
  contactPhone: '2212345678',
  reward: '',
  photoBase64: 'data:image/jpeg;base64,x',
};

beforeEach(() => {
  localStorage.setItem(
    'dasha-user',
    JSON.stringify({ id: 'u1', name: 'Ana', email: 'a@a.com', role: 'citizen' }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('createLostPetReport (contrato de payload)', () => {
  it('traduce especie y talla a los valores del backend', async () => {
    const fetchMock = mockFetchOk();
    await createLostPetReport({ ...base, species: 'gato', size: 'Grande' });
    const body = sentBody(fetchMock);
    expect(body.species).toBe('cat');
    expect(body.size).toBe('large');
    expect(body.condition).toBe('lost');
  });

  it('perro y talla desconocida caen a dog / medium', async () => {
    const fetchMock = mockFetchOk();
    await createLostPetReport({ ...base, species: 'perro', size: 'XL' });
    const body = sentBody(fetchMock);
    expect(body.species).toBe('dog');
    expect(body.size).toBe('medium');
  });

  it('el radio se redondea a entero y nunca baja de 1', async () => {
    const fetchMock = mockFetchOk();
    await createLostPetReport({ ...base, searchRadiusKm: 2.7 });
    expect(sentBody(fetchMock).searchRadiusKm).toBe(3);

    fetchMock.mockClear();
    await createLostPetReport({ ...base, searchRadiusKm: 0.4 });
    expect(sentBody(fetchMock).searchRadiusKm).toBe(1);
  });

  it('manda el teléfono como contactWhatsapp y la foto en un arreglo', async () => {
    const fetchMock = mockFetchOk();
    await createLostPetReport(base);
    const body = sentBody(fetchMock);
    expect(body.contactWhatsapp).toBe('2212345678');
    expect(body.photosBase64).toEqual(['data:image/jpeg;base64,x']);
  });

  it('devuelve el id que responde el backend', async () => {
    mockFetchOk();
    const result = await createLostPetReport(base);
    expect(result.id).toBe('lp1');
  });

  it('sin sesión lanza error y no llama al backend', async () => {
    localStorage.clear();
    const fetchMock = mockFetchOk();
    await expect(createLostPetReport(base)).rejects.toThrow('Inicia sesión');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
