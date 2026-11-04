import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const pharmacy = await db.pharmacy.update({
    where: { id: "main" },
    data: { name: "Pharmacy", address: "" },
  });
  console.log(pharmacy.name);
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
