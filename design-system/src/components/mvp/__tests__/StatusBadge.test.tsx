import { render, screen } from "@testing-library/react";

import { StatusBadge } from "../StatusBadge";

describe("StatusBadge", () => {
  it("renders localized label for active status", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });
});
