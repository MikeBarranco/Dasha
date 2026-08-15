const fs = require('fs');
const path = 'backend/src/controllers/admin.controller.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Fix deleteReport (Add donationProof deletion)
code = code.replace(
  /await tx\.donation\.deleteMany\(\s*\{\s*where:\s*\{\s*animalId:\s*ap\.id\s*\}\s*\}\s*\);/,
  "const donations = await tx.donation.findMany({ where: { animalId: ap.id }, select: { id: true } });\n            if (donations.length > 0) {\n              await tx.donationProof.deleteMany({ where: { donationId: { in: donations.map(d => d.id) } } });\n            }\n            await tx.donation.deleteMany({ where: { animalId: ap.id } });"
);

// 2. Fix deleteUser (Add donationProof deletion)
code = code.replace(
  /await tx\.donation\.deleteMany\(\s*\{\s*where:\s*\{\s*userId:\s*id\s*\}\s*\}\s*\);/,
  "const userDonations = await tx.donation.findMany({ where: { userId: id }, select: { id: true } });\n            if (userDonations.length > 0) {\n              await tx.donationProof.deleteMany({ where: { donationId: { in: userDonations.map(d => d.id) } } });\n            }\n            await tx.donation.deleteMany({ where: { userId: id } });"
);

// 3. Fix deleteOrganization (Add comprehensive cascading)
code = code.replace(
  /static async deleteOrganization\(req: Request, res: Response, next: NextFunction\) \{[\s\S]*?res\.status\(200\)\.json\(\{ message: 'Organización eliminada correctamente' \}\);\s*\}\s*catch\s*\(error\)\s*\{\s*next\(error\);\s*\}\s*\}/,
  "static async deleteOrganization(req: Request, res: Response, next: NextFunction) {\n    try {\n      const id = req.params.id as string;\n      await prisma.$transaction(async (tx) => {\n        await tx.report.updateMany({ where: { destinationOrgId: id }, data: { destinationOrgId: null } });\n        await tx.animalProfile.updateMany({ where: { organizationId: id }, data: { organizationId: null } });\n        await tx.resource.updateMany({ where: { organizationId: id }, data: { organizationId: null } });\n        await tx.organizationEmployee.deleteMany({ where: { organizationId: id } });\n        await tx.discountCode.deleteMany({ where: { organizationId: id } });\n        const needs = await tx.need.findMany({ where: { organizationId: id }, select: { id: true } });\n        if (needs.length > 0) {\n          await tx.needContribution.deleteMany({ where: { needId: { in: needs.map(n => n.id) } } });\n          await tx.need.deleteMany({ where: { organizationId: id } });\n        }\n        await tx.organization.delete({ where: { id } });\n      });\n      res.status(200).json({ message: 'Organización eliminada correctamente' });\n    } catch (error) {\n      next(error);\n    }\n  }"
);

fs.writeFileSync(path, code, 'utf8');
console.log('admin.controller.ts patched successfully');
