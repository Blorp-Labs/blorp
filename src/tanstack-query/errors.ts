export function compareErrors(err: Error, key: keyof typeof Errors) {
  const target = Errors[key].message;
  return err.name === target || err.message === target;
}

export const Errors = {
  MFA_REQUIRED: new Error("MFA_REQUIRED"),
  NOT_IMPLEMENTED: Error("NOT_IMPLEMENTED"),
  OBJECT_NOT_FOUND: new Error("couldnt_find_object"),
};
