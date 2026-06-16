import type { Report, Severity } from '../data/mockReports';

const API_URL = 'http://localhost:3000/api/v1';

export async function getNearbyReports(lat: number, lng: number, radiusKm: number): Promise<Report[]> {
  try {
    const response = await fetch(`${API_URL}/reports/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
    const result = await response.json();
    
    if (result.status === 'success') {
      return result.data.map((r: any) => ({
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        species: r.species === 'cat' ? 'gato' : 'perro',
        condition: r.condition === 'injured' ? 'Herido' : r.condition === 'sick' ? 'Enfermo' : 'Perdido',
        severity: (r.urgency === 'critical' ? 'critica' : r.urgency === 'high' ? 'critica' : r.urgency === 'medium' ? 'media' : 'baja') as Severity,
        photo: r.photo || 'https://res.cloudinary.com/demo/image/upload/dog.jpg',
        colonia: r.colonia || 'Sin colonia',
        reportedAgo: getTimeAgo(r.created_at),
        distance: formatDistance(r.distance_meters),
        status: r.status === 'active' ? 'Activo' : r.status,
        description: r.description || 'Sin descripción',
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}

export async function createReport(data: any) {
  const response = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  if (result.status === 'error' || !response.ok) {
    const details = result.errors ? JSON.stringify(result.errors) : '';
    throw new Error((result.message || 'Error al crear reporte') + (details ? ' ' + details : ''));
  }
  return result;
}

function getTimeAgo(dateString: string): string {
  if (!dateString) return 'hace un momento';
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((new Date().getTime() - date.getTime()) / 60000);
  
  if (diffInMinutes < 60) return `hace ${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours}h`;
  return `hace ${Math.floor(diffInHours / 24)}d`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.floor(meters)}m de ti`;
  return `${(meters / 1000).toFixed(1)}km de ti`;
}
