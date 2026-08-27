import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderPizzaButton from "@/components/contacts/OrderPizzaButton";
import { pizzaSearchUrl } from "@/lib/contacts/format";
import { makeAddress } from "../mocks/handlers";

const openSpy = jest
  .spyOn(window, "open")
  .mockImplementation(() => null);

afterEach(() => openSpy.mockClear());

describe("OrderPizzaButton", () => {
  it("is disabled when the contact has no address", () => {
    render(<OrderPizzaButton addresses={[]} contactName="Ada Lovelace" />);

    expect(
      screen.getByRole("button", { name: /add an address to order/i }),
    ).toBeDisabled();
  });

  it("opens the pizza search directly for a single address", async () => {
    const address = makeAddress({ street: "1600 15th St", postal_code: "94103" });
    render(<OrderPizzaButton addresses={[address]} contactName="Ada Lovelace" />);

    await userEvent.click(
      screen.getByRole("button", { name: /order ada lovelace a pizza/i }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      pizzaSearchUrl(address),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("offers a picker when there are several addresses", async () => {
    const home = makeAddress({ id: 1, type: "home" });
    const work = makeAddress({ id: 2, type: "work", city: "Boston" });
    render(
      <OrderPizzaButton addresses={[home, work]} contactName="Ada Lovelace" />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /order ada lovelace a pizza/i }),
    );
    expect(openSpy).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("menuitem", { name: /work/i }));

    expect(openSpy).toHaveBeenCalledWith(
      pizzaSearchUrl(work),
      "_blank",
      "noopener,noreferrer",
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the picker on Escape without ordering", async () => {
    render(
      <OrderPizzaButton
        addresses={[makeAddress({ id: 1 }), makeAddress({ id: 2, type: "work" })]}
        contactName="Ada Lovelace"
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /order ada lovelace a pizza/i }),
    );
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
