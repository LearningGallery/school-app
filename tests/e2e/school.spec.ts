import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.E2E_ADMIN_PASSWORD;
test.skip(!password, "set E2E_ADMIN_PASSWORD");

test("login, create student, mark attendance, view grade report", async ({
  page,
}) => {
  const run = Date.now();
  const name = `Ada ${run}`;
  const className = `Maths ${run}`;

  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();

  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(`ada.${run}@example.com`);
  await page.getByRole("button", { name: "Add student" }).click();
  await expect(page.getByRole("cell", { name })).toBeVisible();

  await page.getByRole("link", { name: "Attendance" }).click();
  await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
  await page.getByLabel("New class name").fill(className);
  await page.getByRole("button", { name: "Add class" }).click();
  await page.getByLabel("Student").selectOption({ label: name });
  await page.getByLabel("Status").selectOption("present");
  await page.getByRole("button", { name: "Mark" }).click();
  await expect(
    page.getByRole("list", { name: "Attendance marks" }),
  ).toContainText(`${name}: present`);

  await page.getByRole("link", { name: "Grades" }).click();
  // wait for the route to change, or the Attendance page's "Student" select is matched instead
  await expect(
    page.getByRole("heading", { name: "Grade report" }),
  ).toBeVisible();
  await page.getByLabel("Student").selectOption({ label: name });
  await page.getByLabel("Grade class").selectOption({ label: className });
  await page.getByLabel("Score").fill("88");
  await page.getByRole("button", { name: "Save grade" }).click();
  await expect(page.getByRole("cell", { name: className })).toBeVisible();
  await expect(page.getByText("Average: 88")).toBeVisible();
});
