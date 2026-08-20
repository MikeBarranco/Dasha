const fs = require('fs');
const path = './frontend/src/lib/api.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /export async function deleteMyOrgAnimalPhoto[^\}]+\}\);/m,
  export async function deleteMyOrgAnimalPhoto(animalId: string, url: string, orgId?: string): Promise<void> {
  const queryParam = orgId ? '&' : '?';
  await authedRaw(\/portal/animals/\/photos\\url=\\, {
    method: 'DELETE',
    body: JSON.stringify({ url }),
  });
}
);
fs.writeFileSync(path, code);
