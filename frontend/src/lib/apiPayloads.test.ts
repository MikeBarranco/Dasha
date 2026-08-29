import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createNeed, createDirectIntakeAnimal, createOrgEvent } from './api';
import { createAdminAnimal, eventCategoryOptions } from './adminApi';

// Estas pruebas blindan los CONTRATOS con el backend que corregimos: verifican el
// cuerpo EXACTO (nombres de campos y valores) que el frontend manda en cada POST,
// para que no se vuelvan a desalinear sin que una prueba truene primero.

// Deja una sesión guardada (authedRaw/adminFetch la exigen) y un fetch simulado
// que siempre responde OK. Devuelve el mock para inspeccionar lo que se envió.
function mockFetchOk() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ status: 'success', data: {} }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// El tipo del mock no conoce los argumentos de fetch; los leemos con un cast.
type FetchCall = [url: string, options?: RequestInit];

function callArgs(fetchMock: ReturnType<typeof mockFetchOk>, call: number): FetchCall | undefined {
  return fetchMock.mock.calls[call] as unknown as FetchCall | undefined;
}

// Lee el body JSON del primer (o n-ésimo) fetch simulado.
function sentBody(fetchMock: ReturnType<typeof mockFetchOk>, call = 0): Record<string, unknown> {
  const options = callArgs(fetchMock, call)?.[1];
  return JSON.parse((options?.body as string) ?? '{}');
}

function sentUrl(fetchMock: ReturnType<typeof mockFetchOk>, call = 0): string {
  return String(callArgs(fetchMock, call)?.[0] ?? '');
}

beforeEach(() => {
  localStorage.setItem(
    'dasha-user',
    JSON.stringify({ id: 'u1', name: 'Test', email: 't@t.com', role: 'admin' }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('createNeed (Necesidades)', () => {
  it('manda category (no type) y la cantidad estructurada como targetAmount + unit', async () => {
    const fetchMock = mockFetchOk();
    await createNeed('org1', {
      category: 'food',
      title: 'Croquetas',
      description: 'Se nos acaba el alimento',
      quantityValue: 20,
      unit: 'kg',
    });
    const body = sentBody(fetchMock);
    expect(sentUrl(fetchMock)).toContain('/organizations/org1/needs');
    expect(body.category).toBe('food');
    expect(body.description).toBe('Se nos acaba el alimento');
    expect(body.targetAmount).toBe(20);
    expect(body.unit).toBe('kg');
    expect(body).not.toHaveProperty('type');
    expect(body).not.toHaveProperty('quantity');
  });

  it('sin cantidad no manda targetAmount ni unit', async () => {
    const fetchMock = mockFetchOk();
    await createNeed('org1', { category: 'transport', title: 'Traslado', description: 'A la vet' });
    const body = sentBody(fetchMock);
    expect(body.description).toBe('A la vet');
    expect(body).not.toHaveProperty('targetAmount');
    expect(body).not.toHaveProperty('unit');
  });

  it('con cantidad y sin descripción manda targetAmount + unit', async () => {
    const fetchMock = mockFetchOk();
    await createNeed('org1', { category: 'foster', title: 'Hogar', quantityValue: 2, unit: 'noches' });
    const body = sentBody(fetchMock);
    expect(body.targetAmount).toBe(2);
    expect(body.unit).toBe('noches');
    expect(body).not.toHaveProperty('description');
  });
});

describe('createDirectIntakeAnimal (alta directa)', () => {
  it('manda color (no primaryColor)', async () => {
    const fetchMock = mockFetchOk();
    await createDirectIntakeAnimal({
      name: 'Canela',
      species: 'dog',
      size: 'medium',
      color: 'Café',
      photosBase64: ['data:image/jpeg;base64,x'],
    });
    const body = sentBody(fetchMock);
    expect(sentUrl(fetchMock)).toContain('/portal/animals/direct-intake');
    expect(body.color).toBe('Café');
    expect(body).not.toHaveProperty('primaryColor');
  });
});

describe('createOrgEvent (eventos)', () => {
  it('manda la categoría tal cual (enum en inglés) y omite endDate vacío', async () => {
    const fetchMock = mockFetchOk();
    await createOrgEvent('org1', {
      title: 'Jornada de esterilización',
      description: 'Ven con tu perrito',
      category: 'sterilization',
      eventDate: '2026-09-01T10:00:00.000Z',
      address: 'Parque Juárez',
    });
    const body = sentBody(fetchMock);
    expect(body.category).toBe('sterilization');
    expect(body).not.toHaveProperty('endDate');
  });
});

describe('createAdminAnimal (rehabilitación)', () => {
  it('manda story/totalCostNeeded y NO diagnosis/treatment/history/estimatedCost', async () => {
    const fetchMock = mockFetchOk();
    await createAdminAnimal({
      name: 'Firulais',
      species: 'dog',
      status: 'in_treatment',
      history: 'Rescatado de la calle',
      estimatedCost: 3000,
    });
    const body = sentBody(fetchMock);
    expect(body.story).toBe('Rescatado de la calle');
    expect(body.totalCostNeeded).toBe(3000);
    expect(body).not.toHaveProperty('history');
    expect(body).not.toHaveProperty('estimatedCost');
    expect(body).not.toHaveProperty('diagnosis');
    expect(body).not.toHaveProperty('treatment');
  });
});

describe('eventCategoryOptions (catálogo de categorías)', () => {
  it('usa los enums oficiales del backend en inglés', () => {
    expect(eventCategoryOptions.map((option) => option.value)).toEqual([
      'sterilization',
      'vaccination',
      'grooming',
      'donation',
      'adoption',
      'talk',
      'other',
    ]);
  });
});
