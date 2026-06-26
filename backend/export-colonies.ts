import { prisma } from './src/config/db';
import * as fs from 'fs';
import * as path from 'path';

async function exportColonies() {
  try {
    console.log('Fetching colonies...');
    const colonies = await prisma.colony.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        municipality: true,
        postalCode: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`Found ${colonies.length} colonies.`);

    let csvContent = 'id,name,city,municipality,postalCode\n';
    
    for (const c of colonies) {
      // Escape quotes and wrap in quotes if there are commas
      const name = `"${c.name.replace(/"/g, '""')}"`;
      const city = `"${c.city.replace(/"/g, '""')}"`;
      const mun = `"${c.municipality.replace(/"/g, '""')}"`;
      const pc = c.postalCode || '';
      
      csvContent += `${c.id},${name},${city},${mun},${pc}\n`;
    }

    const outputPath = path.join(process.cwd(), 'colonies_export.csv');
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
    console.log(`Exported successfully to: ${outputPath}`);

  } catch (error) {
    console.error('Error exporting:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportColonies();
