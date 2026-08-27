import React from "react";
import { render } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { makeContact } from "../mocks/handlers";

describe("ContactAvatar", () => {
  it("shows initials when the contact has no photo", () => {
    const { container } = render(<ContactAvatar contact={makeContact()} />);

    expect(container.textContent).toBe("AL");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("shows the photo as a circular image when set", () => {
    const photo = "data:image/png;base64,aGVsbG8=";
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo })} />,
    );

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", photo);
    expect(img).toHaveClass("rounded-full", "object-cover");
    expect(container.textContent).toBe("");
  });
});
