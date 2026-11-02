import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { setToken } from "./api";

afterEach(() => {
  cleanup();
  setToken(null);
});

describe("routing", () => {
  it("sends anonymous users to the login page", () => {
    render(
      <MemoryRouter initialEntries={["/students"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "School login" })).toBeTruthy();
  });
});
