import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.E2E_ADMIN_PASSWORD;
test.skip(!password, "set E2E_ADMIN_PASSWORD");

test("login, create class and student, mark attendance, grade, invoice, announce", async ({
  page,
}) => {
  const run = Date.now();
  const name = `Ada ${run}`;
  const className = `Maths ${run}`;
  const today = new Date().toISOString().slice(0, 10);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign In to Edusync" }).click();
  await expect(page.getByText(/Welcome back/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Total Students/ }),
  ).toBeVisible();

  // Classes
  await page.getByRole("link", { name: "Classes" }).click();
  await page.getByRole("button", { name: "Add Class" }).click();
  await page.getByLabel("Class name").fill(className);
  await page.getByLabel("Grade", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Save Class" }).click();
  await expect(page.getByRole("heading", { name: className })).toBeVisible();

  // Students
  await page.getByRole("link", { name: "Students" }).click();
  await page.getByRole("button", { name: "Add Student" }).click();
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email Address").fill(`ada.${run}@example.com`);
  await page.getByLabel("Assign to Class").selectOption({ label: className });
  await page.getByRole("button", { name: "Confirm Enrollment" }).click();
  await expect(
    page.getByRole("cell", { name: new RegExp(name) }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: className })).toBeVisible();

  // Attendance
  await page.getByRole("link", { name: "Attendance" }).click();
  await page.getByRole("button", { name: "Mark Attendance" }).click();
  await page
    .getByLabel("Class", { exact: true })
    .selectOption({ label: className });
  await page
    .getByLabel("Student", { exact: true })
    .selectOption({ label: name });
  await page.getByLabel("Status").selectOption("present");
  await page.getByRole("button", { name: "Mark", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "Attendance summary" }),
  ).toContainText(className);
  await expect(page.getByLabel("Date")).toHaveValue(today);

  // Grades
  await page.getByRole("link", { name: "Grades" }).click();
  await page.getByRole("button", { name: "Add Grade" }).click();
  await page
    .getByLabel("Student", { exact: true })
    .selectOption({ label: name });
  await page
    .getByLabel("Class", { exact: true })
    .selectOption({ label: className });
  await page.getByLabel("Score").fill("88");
  await page.getByLabel("Remarks").fill("Good progress");
  await page.getByRole("button", { name: "Save grade" }).click();
  await expect(page.getByRole("cell", { name: /Good progress/ })).toBeVisible();

  // Fees
  await page.getByRole("link", { name: "Fees" }).click();
  await page.getByRole("button", { name: "Generate Invoice" }).click();
  await page
    .getByLabel("Student", { exact: true })
    .selectOption({ label: name });
  await page.getByLabel("Amount").fill("250");
  await page.getByRole("button", { name: "Create invoice" }).click();
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("$250.00");
  await row.getByRole("button", { name: "Mark paid" }).click();
  await expect(row).toContainText("paid");

  // Announcements
  await page.getByRole("link", { name: "Announcements" }).click();
  await page.getByRole("button", { name: "New Announcement" }).click();
  await page.getByLabel("Title").fill(`Notice ${run}`);
  await page.getByLabel("Message").fill("Mid-term exams next week");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `Notice ${run}` }),
  ).toBeVisible();
});
