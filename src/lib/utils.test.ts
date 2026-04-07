import { describe, expect, test } from "vitest";
import { formatOrdinal, unsafeParseJwt, urlStripAfterPath } from "./utils";

describe("utils", () => {
  describe("formatOrdinal", () => {
    test.each([
      [1, "1st"],
      [2, "2nd"],
      [3, "3rd"],
      [4, "4th"],
      [5, "5th"],
      [6, "6th"],
      [7, "7th"],
      [8, "8th"],
      [9, "9th"],
      [10, "10th"],
      [20, "20th"],
      [21, "21st"],
      [22, "22nd"],
      [23, "23rd"],
      [24, "24th"],
      [30, "30th"],
      [100, "100th"],
      [121, "121st"],
    ])("%s => %s", (input, output) => {
      expect(formatOrdinal(input)).toBe(output);
    });
  });

  describe("unsafeParseJwt", () => {
    test.each([
      [
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJhdXRoLXNlcnZpY2UiLCJpYXQiOjE3NzQzMDcwOTAsImF1ZCI6Imh0dHBzOi8vYXBpLnJlZGdpZnMuY29tIiwiYXpwIjoiMTgyM2MzMWY3ZDMtNzQ1YS02NTg5LTAwMDUtZDhlOGZlMGE0NGMyIiwiZXhwIjoxNzc0MzkzNDkwLCJzdWIiOiJjbGllbnQvMTgyM2MzMWY3ZDMtNzQ1YS02NTg5LTAwMDUtZDhlOGZlMGE0NGMyIiwic2NvcGVzIjoicmVhZCIsInZhbGlkX2FkZHIiOiIyMy4yMzQuMTAzLjk3IiwidmFsaWRfYWdlbnQiOiJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMC4xNTsgcnY6MTQ4LjApIEdlY2tvLzIwMTAwMTAxIEZpcmVmb3gvMTQ4LjAiLCJyYXRlIjotMSwiaHR0cHM6Ly9yZWRnaWZzLmNvbS9zZXNzaW9uLWlkIjoiMzkyNzc4OTY0MTgxMDY0OTMyIn0.qN72h1yTK--3IEDO5MrGwC_EO7TmS_Yd8m7eLDofDEkN0hC_3siW3XfaalgQIWtI_OaVAG2l7y46NNdg-_V2iRQ3L-cnzowhyabqjqOjZDGWiX0uKy8J153YYN8PU2R3rkyU3gcSr2wlIIzC9vAGQELiEQp21DgHLKf4MRNyxzqmX03m237ZSiWfswtAtg2E84cUsaB7mN0w1k_QHs3MV3MAlMLFCf7IZXEFn7gZGYfkFPcV6Ml-fMdUJAb0kPSV9aiYD_qGBkUfAEb1GKo55eJ5Jaerccb_k0KHQ12QnkHAgvHCSJIWz-6ZHZpbLTSOqgRc9L_Pj0MfCOiUFkmKXg",
        { exp: 1774393490 },
      ],
      [
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImp0aSI6ImU3YjQ0Mjc4LTZlZDYtNDJlZC05MTZmLWFjZDQzNzhkM2U0YSIsImlhdCI6MTU5NTg3NzUxOCwiZXhwIjoxNTk1ODgxMTE4fQ.WXyDlDMMSJAjOFF9oAU9JrRHg2wio-WolWAkAaY3kg4",

        { exp: 1595881118 },
      ],
      [
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJhdXRoLXNlcnZpY2UiLCJpYXQiOjE3NzQzMDczMjgsImF1ZCI6Imh0dHBzOi8vYXBpLnJlZGdpZnMuY29tIiwiYXpwIjoiMTgyM2MzMWY3ZDMtNzQ1YS02NTg5LTAwMDUtZDhlOGZlMGE0NGMyIiwiZXhwIjoxNzc0MzkzNzI4LCJzdWIiOiJjbGllbnQvMTgyM2MzMWY3ZDMtNzQ1YS02NTg5LTAwMDUtZDhlOGZlMGE0NGMyIiwic2NvcGVzIjoicmVhZCIsInZhbGlkX2FkZHIiOiIyMy4yMzQuMTAzLjk3IiwidmFsaWRfYWdlbnQiOiJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMC4xNTsgcnY6MTQ4LjApIEdlY2tvLzIwMTAwMTAxIEZpcmVmb3gvMTQ4LjAiLCJyYXRlIjotMSwiaHR0cHM6Ly9yZWRnaWZzLmNvbS9zZXNzaW9uLWlkIjoiMzkyNzc4OTY0MTgxMDY0OTMyIn0.HcK4X-ciJeNGgTeuBXMohGKGHgSl7-ovvOY19X7MBxAZPL41n-jBzDiC0z_UA7vPxks7RyXPPfzfv1VE259BKG_-32c-aW8GYcUa18WClezPzUR-Ywoe53fSOlk4ne_3MYhjm05qYamYEZxUCwAdvkU8nhOFgj9Av9URYghBOhDef8iu30zeiLQ-3VB269Y_h3AtrqaGipQA2N5uz3mJxdVv3wKVoll8OZ0_oeqVuoQoZhjXqM-rA19C3A5TeObjc4bPqPAH4nEyb7PmQw5GZaDWwUVmotZvWVCqj9Py5xjEcgZZ7RfYpXkpfCG3oXytNAX9OFiAXuEAA0oSgeQzmA",
        {
          exp: 1774393728,
        },
      ],
    ])("%s => %o", (token, expected) => {
      expect(unsafeParseJwt(token)).toEqual(expected);
    });
  });

  describe("urlStripAfterPath", () => {
    test.each([
      ["https://google.com?q=123", "https://google.com"],
      ["https://google.com/somepage/?q=123", "https://google.com/somepage/"],
      ["https://google.com/somepage?q=123", "https://google.com/somepage"],
      ["/somepage/?q=123", "/somepage/"],
      ["/somepage?q=123", "/somepage"],
    ])("%s => %s", (input, output) => {
      expect(urlStripAfterPath(input)).toBe(output);
    });
  });
});
