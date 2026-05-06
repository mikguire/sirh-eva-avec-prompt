import type { Meta, StoryObj } from "@storybook/react";

import { EmployeeCard } from "../EmployeeCard";

const meta: Meta<typeof EmployeeCard> = {
  title: "EVA/MVP/EmployeeCard",
  component: EmployeeCard,
};

export default meta;

type Story = StoryObj<typeof EmployeeCard>;

export const Default: Story = {
  args: {
    employee: {
      id: "emp_001",
      firstName: "Nora",
      lastName: "Benali",
      role: "HR Business Partner",
      team: "People Ops",
      status: "active",
    },
  },
};
