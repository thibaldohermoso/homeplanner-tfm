import { expect, test } from "@playwright/test";

const emailA = process.env.SUPABASE_TEST_EMAIL_A;
const passwordA = process.env.SUPABASE_TEST_PASSWORD_A;
const emailB = process.env.SUPABASE_TEST_EMAIL_B;
const passwordB = process.env.SUPABASE_TEST_PASSWORD_B;

test.skip(!emailA || !passwordA || !emailB || !passwordB, "Configura los dos usuarios de prueba y comparte un hogar antes de ejecutar E2E.");

test("un usuario ve en vivo una tarea y una compra de otro usuario", async ({ browser, baseURL }) => {
  const contextA = await browser.newContext({ baseURL });
  const contextB = await browser.newContext({ baseURL });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto("/login");
  await pageA.getByLabel("Email").fill(emailA!);
  await pageA.getByLabel("Contraseña").fill(passwordA!);
  await pageA.getByRole("button", { name: "Iniciar sesión" }).click();
  await pageA.goto("/tasks");
  const taskTitle = `Tarea E2E ${Date.now()}`;
  await pageA.getByLabel("Título").fill(taskTitle);
  await pageA.getByRole("button", { name: "Añadir tarea" }).click();

  await pageA.goto("/shopping");
  await pageA.getByLabel("Nombre de la nueva lista").fill(`Lista E2E ${Date.now()}`);
  await pageA.getByRole("button", { name: "Crear" }).click();
  await pageA.getByLabel("Artículo").fill(`Artículo E2E ${Date.now()}`);
  await pageA.getByRole("button", { name: "Añadir artículo" }).click();

  await pageB.goto("/login");
  await pageB.getByLabel("Email").fill(emailB!);
  await pageB.getByLabel("Contraseña").fill(passwordB!);
  await pageB.getByRole("button", { name: "Iniciar sesión" }).click();
  await pageB.goto("/tasks");
  await expect(pageB.getByText(taskTitle)).toBeVisible({ timeout: 15000 });
  await pageB.goto("/shopping");
  await expect(pageB.getByText(/Artículo E2E/)).toBeVisible({ timeout: 15000 });

  await contextA.close();
  await contextB.close();
});
