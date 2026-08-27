import {
  CONTACT_FIELDS,
  EXTRA_FIELD_NAMES,
  PHOTO_MAX_LENGTH,
  contactInputSchema,
  formDataToValues,
  zodFieldErrors,
} from "@/lib/contacts/schema";

const PHOTO_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function values(overrides: Record<string, string> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    addresses: "",
    notes: "",
    photo: "",
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("accepts an image data URL as the photo and nulls out a blank one", () => {
    expect(contactInputSchema.parse(values({ photo: PHOTO_DATA_URL })).photo).toBe(
      PHOTO_DATA_URL,
    );
    expect(contactInputSchema.parse(values()).photo).toBeNull();
  });

  it("rejects a photo that is not an image data URL", () => {
    for (const bad of ["https://example.com/x.png", "data:text/html;base64,PGI+"]) {
      const result = contactInputSchema.safeParse(values({ photo: bad }));
      expect(zodFieldErrors(result.error!).photo).toBe(
        "Photo must be a PNG, JPEG, GIF, or WebP image",
      );
    }
  });

  it("rejects an oversized photo", () => {
    const result = contactInputSchema.safeParse(
      values({ photo: "data:image/png;base64," + "A".repeat(PHOTO_MAX_LENGTH) }),
    );
    expect(zodFieldErrors(result.error!).photo).toBe(
      "Photo is too large — choose an image under 2 MB",
    );
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: "a".repeat(101), company: "c".repeat(201) }),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
      company: "Company must be 200 characters or fewer",
    });
  });

  it("parses the address rows out of the hidden JSON input", () => {
    const parsed = contactInputSchema.parse(
      values({
        addresses: JSON.stringify([
          { type: "work", street: "1 Market St", city: "San Francisco", state: "", postal_code: "", country: "USA" },
        ]),
      }),
    );

    expect(parsed.addresses).toEqual([
      {
        type: "work",
        street: "1 Market St",
        city: "San Francisco",
        state: null,
        postal_code: null,
        country: "USA",
      },
    ]);
    expect(contactInputSchema.parse(values()).addresses).toEqual([]);
  });

  it("rejects an unknown address type and unreadable JSON", () => {
    const badType = contactInputSchema.safeParse(
      values({ addresses: JSON.stringify([{ type: "vacation" }]) }),
    );
    expect(badType.success).toBe(false);
    expect(zodFieldErrors(badType.error!).addresses).toBeDefined();

    const badJson = contactInputSchema.safeParse(values({ addresses: "{not json" }));
    expect(zodFieldErrors(badJson.error!).addresses).toBe(
      "Addresses could not be read",
    );
  });
});

describe("formDataToValues", () => {
  it("pulls every known field out, defaulting to an empty string", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(Object.keys(extracted).sort()).toEqual(
      [...CONTACT_FIELDS.map((field) => field.name), ...EXTRA_FIELD_NAMES].sort(),
    );
  });
});
