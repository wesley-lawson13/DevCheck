import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./NotFound";

test("renders the 404 message", () => {
  render(<NotFound />);
  expect(screen.getByText("404 Not Found")).toBeInTheDocument();
});
