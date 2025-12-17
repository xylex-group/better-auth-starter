import * as authModule from "../lib/auth";

const auth =
  (authModule as any).auth ??
  (authModule as any).default;

export { auth };
export default auth;